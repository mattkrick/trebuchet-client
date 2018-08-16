import Backoff from 'backo2'
import EventEmitter from 'eventemitter3'
import {
  CLOSE,
  CONNECTION_ERROR,
  DATA,
  Data,
  KEEP_ALIVE,
  MAX_INT, SSE_ID,
  TRANSPORT_CONNECTED,
  TRANSPORT_DISCONNECTED,
  TRANSPORT_RECONNECTED,
  TRANSPORT_SUPPORTED,
  TrebuchetEmitter
} from './getTrebuchet'

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

class SSETrebuchet extends (EventEmitter as TrebuchetEmitter) {
  source!: EventSource
  private readonly backoff: Backoff = new Backoff({jitter: 0.5, min: 1000})
  private readonly timeout: number
  private readonly url: string
  private readonly fetchData: FetchData
  private readonly fetchPing: FetchPing
  private connectionId?: string
  private unsentMessagesQueue: Array<Data> = []
  private canConnect: boolean | undefined = undefined
  private isTerminal: boolean = false
  private reconnectTimeoutId: number | undefined
  private keepAliveTimeoutId: number | undefined

  constructor (settings: SSESettings) {
    super()
    this.timeout = settings.timeout || 10000
    this.url = settings.url
    this.fetchData = settings.fetchData
    this.fetchPing = settings.fetchPing
    this.setupSource()
  }

  private flushUnsentMessagesQueue () {
    this.unsentMessagesQueue.forEach((message) => {
      this.send(message)
    })
    this.unsentMessagesQueue.length = 0
  }

  private responseToKeepAlive = () => {
    if (!this.connectionId || !this.timeout || this.timeout > MAX_INT) return
    this.fetchPing(this.connectionId).catch()
    clearTimeout(this.keepAliveTimeoutId)
    // the server sends a message every 10 seconds
    // the client will close if it does not receive a message in 15 seconds after the last was received
    this.keepAliveTimeoutId = window.setTimeout(this.source.close(), this.timeout * 1.5)
  }

  private setupSource = () => {
    this.source = new EventSource(this.url)
    this.source.onopen = () => {
      const transportMessage = this.reconnectTimeoutId ? TRANSPORT_RECONNECTED : TRANSPORT_CONNECTED
      if (!this.reconnectTimeoutId) {
        this.canConnect = true
        this.emit(TRANSPORT_SUPPORTED, true)
      }
      this.reconnectTimeoutId = undefined
      this.backoff.reset()
      this.flushUnsentMessagesQueue()
      this.emit(transportMessage)
    }

    this.source.onerror = () => {
      if (this.canConnect === undefined) {
        this.canConnect = false
        this.emit(TRANSPORT_SUPPORTED, false)
      } else if (this.canConnect && !this.isTerminal) {
        if (!this.reconnectTimeoutId) {
          this.emit(TRANSPORT_DISCONNECTED)
        }
        this.tryReconnect()
      }
    }

    this.source.addEventListener(KEEP_ALIVE, this.responseToKeepAlive)
    this.source.addEventListener(SSE_ID, (event: any) => {
      this.connectionId = event.data
      this.flushUnsentMessagesQueue()
    })
    this.source.addEventListener(CONNECTION_ERROR, (event: any) => {
      this.close(event.data as string)
    })
    this.source.onmessage = (event: MessageEvent) => {
      this.emit(DATA, event.data)
    }
  }

  private tryReconnect () {
    if (this.isTerminal) return
    if (!this.reconnectTimeoutId) {
      this.reconnectTimeoutId = window.setTimeout(() => {
        this.setupSource()
      }, this.backoff.duration())
    }
  }

  private handleFetch = async (message: Data) => {
    const res = await this.fetchData(message, this.connectionId!)
    if (res) {
      this.emit(DATA, res)
    }
  }

  send (message: Data) {
    if (this.source.readyState === this.source.OPEN && this.connectionId) {
      this.handleFetch(message).catch()
    } else {
      this.unsentMessagesQueue.push(message)
    }
  }

  close (reason?: string) {
    this.isTerminal = true
    this.unsentMessagesQueue.length = 0
    this.source.close()
    this.emit(CLOSE, reason)
  }

  async isSupported () {
    if (this.canConnect !== undefined) return this.canConnect
    return new Promise<boolean>((resolve) => {
      super.once(TRANSPORT_SUPPORTED, resolve)
    })
  }
}

export default SSETrebuchet
