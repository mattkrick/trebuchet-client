import Trebuchet, {Data, Events, MAX_INT, SSE_ID, SSE_CLOSE_EVENT} from './Trebuchet'

interface MessageEvent {
  data: Data
}

export type FetchData = (data: any, connectionId: string) => Promise<Response>
export type FetchPing = (connectionId: string) => Promise<Response>

export interface SSESettings {
  url: string
  fetchData: FetchData
  fetchPing: FetchPing
  timeout?: number
}

class SSETrebuchet extends Trebuchet {
  source!: EventSource
  private readonly url: string
  private readonly fetchData: FetchData
  private readonly fetchPing: FetchPing
  private connectionId: string | undefined = undefined
  constructor (settings: SSESettings) {
    super(settings)
    this.url = settings.url
    this.fetchData = settings.fetchData
    this.fetchPing = settings.fetchPing
    this.setup()
  }

  protected setup = () => {
    this.source = new EventSource(this.url)
    this.source.onopen = this.handleOpen.bind(this)

    this.source.onerror = () => {
      this.connectionId = undefined
      if (this.canConnect === undefined) {
        this.canConnect = false
        // keep it from reconnecting
        this.source.close()
        this.emit(Events.TRANSPORT_SUPPORTED, false)
      } else if (this.canConnect) {
        if (this.reconnectAttempts === 0) {
          // only send the message once per disconnect
          this.emit(Events.TRANSPORT_DISCONNECTED)
        }
        // EventSources have a built-in retry protocol, we'll just use that
        this.reconnectAttempts++
      }
    }

    this.source.addEventListener(Events.KEEP_ALIVE, () => {
      if (!this.connectionId || !this.timeout || this.timeout > MAX_INT) return
      this.fetchPing(this.connectionId).catch()
      clearTimeout(this.keepAliveTimeoutId)
      this.keepAliveTimeoutId = window.setTimeout(() => {
        this.keepAliveTimeoutId = undefined
        this.source.close()
        this.emit(Events.TRANSPORT_DISCONNECTED)
        this.reconnectAttempts++
        this.setup()
      }, this.timeout * 1.5)
    })

    this.source.addEventListener(SSE_ID, (event: any) => {
      this.connectionId = event.data
      this.messageQueue.flush(this.send)
    })

    this.source.addEventListener(SSE_CLOSE_EVENT, (event: any) => {
      const splitIdx = event.data.indexOf(':')
      const code = event.data.slice(0, splitIdx)
      const reason = event.data.slice(splitIdx + 1)
      this.emit(Events.CLOSE, {code, reason, isClientClose: false})
      this.source.close()
    })

    this.source.onmessage = (event: MessageEvent) => {
      this.emit(Events.DATA, event.data)
    }
  }

  private handleFetch = async (message: Data) => {
    const res = await this.fetchData(message, this.connectionId!)
    if (res) {
      this.emit(Events.DATA, res)
    }
  }

  send = (message: Data) => {
    if (this.source.readyState === this.source.OPEN && this.connectionId) {
      this.handleFetch(message).catch()
    } else {
      this.messageQueue.add(message)
    }
  }

  close (reason?: string) {
    // called by the user, so we know it's intentional
    this.canConnect = false
    this.messageQueue.clear()
    this.source.close()
    this.emit(Events.CLOSE, {code: 1000, reason, isClientClose: true})
  }
}

export default SSETrebuchet
