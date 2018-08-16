import Backoff from 'backo2'
import EventEmitter from 'eventemitter3'
import {
  CLOSE,
  CONNECTION_ERROR,
  DATA,
  Data,
  KEEP_ALIVE,
  MAX_INT,
  TRANSPORT_CONNECTED,
  TRANSPORT_DISCONNECTED,
  TRANSPORT_RECONNECTED,
  TRANSPORT_SUPPORTED, TREBUCHET_WS,
  TrebuchetEmitter
} from './getTrebuchet'

interface MessageEvent {
  data: Data
}

export interface WSSettings {
  url: string
  timeout?: number
}

class SocketTrebuchet extends (EventEmitter as TrebuchetEmitter) {
  ws!: WebSocket
  private readonly backoff: Backoff = new Backoff({jitter: 0.5, min: 1000})
  private readonly timeout: number
  private readonly url: string
  private unsentMessagesQueue: Array<Data> = []
  private canConnect: boolean | undefined = undefined
  private isTerminal: boolean = false
  private reconnectTimeoutId: number | undefined
  private keepAliveTimeoutId: number | undefined

  constructor (settings: WSSettings) {
    super()
    this.timeout = settings.timeout || 10000
    this.url = settings.url
    this.setupSocket()
  }

  private flushUnsentMessagesQueue () {
    this.unsentMessagesQueue.forEach((message) => {
      this.send(message)
    })
    this.unsentMessagesQueue.length = 0
  }

  private responseToKeepAlive () {
    this.ws.send(KEEP_ALIVE)
    if (!this.timeout || this.timeout > MAX_INT) return
    console.log('clearning old keepAliveTimeout', this.keepAliveTimeoutId)
    clearTimeout(this.keepAliveTimeoutId)
    // the server sends a message every 10 seconds
    // the client will close if it does not receive a message in 15 seconds after the last was received
    this.keepAliveTimeoutId = window.setTimeout(this.ws.close.bind(this.ws), this.timeout * 1.5)
  }

  private handleStringMessage(message: string) {
    let res
    try {
      res = JSON.parse(message)
    } catch {
      this.emit(DATA, message)
      return
    }
    if (res.type === CONNECTION_ERROR) {
      // this assumes we don't want the client to reconnect
      this.close(res.payload.error)
    } else {
      this.emit(DATA, res)
    }
  }

  private setupSocket () {
    this.ws = new WebSocket(this.url, TREBUCHET_WS)
    this.ws.onopen = () => {
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

    this.ws.onerror = () => {
      if (this.canConnect === undefined) {
        this.canConnect = false
        this.emit(TRANSPORT_SUPPORTED, false)
      }
    }

    this.ws.onmessage = (event: MessageEvent) => {
      const {data} = event
      if (data === KEEP_ALIVE) {
        console.log('got keep alive responding')
        this.responseToKeepAlive()
      } else if (typeof data === 'string') {
        this.handleStringMessage(data)
      } else {
        this.emit(DATA, event.data)
      }
    }

    this.ws.onclose = () => {
      // if the user or the firewall caused the close, don't reconnect & don't announce the disconnect
      if (this.isTerminal || !this.canConnect) return
      if (!this.reconnectTimeoutId) {
        this.emit(TRANSPORT_DISCONNECTED)
      }
      this.tryReconnect()
    }
  }

  private tryReconnect () {
    if (this.isTerminal) return
    if (!this.reconnectTimeoutId) {
      this.reconnectTimeoutId = window.setTimeout(() => {
        this.setupSocket()
      }, this.backoff.duration())
    }
  }

  send (message: Data) {
    if (this.ws.readyState === this.ws.OPEN) {
      this.ws.send(message)
    } else {
      this.unsentMessagesQueue.push(message)
    }
  }

  close (reason?: string) {
    this.isTerminal = true
    this.unsentMessagesQueue.length = 0
    this.ws.close(1000, reason)
    this.emit(CLOSE, reason)
  }

  async isSupported () {
    if (this.canConnect !== undefined) return this.canConnect
    return new Promise<boolean>((resolve) => {
      super.once(TRANSPORT_SUPPORTED, resolve)
    })
  }
}

export default SocketTrebuchet
