import Trebuchet, {Data, TrebuchetSettings} from './Trebuchet'

export type FetchData = (data: any, connectionId: string) => Promise<Data>
export type FetchPing = (connectionId: string) => Promise<Response>

export interface SSESettings extends TrebuchetSettings {
  url: string
  fetchData: FetchData
  fetchPing: FetchPing
}
const MAX_INT = 2 ** 31 - 1

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
        this.emit('supported', false)
      } else if (this.canConnect) {
        if (this.reconnectAttempts === 0) {
          // only send the message once per disconnect
          this.emit('disconnected')
        }
        // EventSources have a built-in retry protocol, we'll just use that
        this.reconnectAttempts++
      }
    }

    this.source.addEventListener('ka', () => {
      if (!this.connectionId || !this.timeout || this.timeout > MAX_INT) return
      this.fetchPing(this.connectionId).catch()
      clearTimeout(this.keepAliveTimeoutId)
      this.keepAliveTimeoutId = window.setTimeout(() => {
        this.keepAliveTimeoutId = undefined
        this.source.close()
        this.emit('disconnected')
        this.reconnectAttempts++
        this.setup()
      }, this.timeout * 1.5)
    })

    this.source.addEventListener('id', (event: any) => {
      this.connectionId = event.data
      this.messageQueue.flush(this.send)
    })

    this.source.addEventListener('close', (event: any) => {
      const splitIdx = event.data.indexOf(':')
      const code = event.data.slice(0, splitIdx)
      const reason = event.data.slice(splitIdx + 1)
      this.emit('close', {code, reason})
      this.source.close()
    })

    this.source.onmessage = (event: MessageEvent) => {
      this.emit('data', JSON.parse(event.data))
    }
  }

  private handleFetch = async (message: Data) => {
    const res = await this.fetchData(message, this.connectionId!)
    if (res) {
      this.emit('data', res)
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
    this.messageQueue.clear()
    if (this.source.CLOSED) return
    // called by the user, so we know it's intentional
    this.canConnect = false
    this.source.close()
    this.emit('close', {code: 1000, reason})
  }
}

export default SSETrebuchet
