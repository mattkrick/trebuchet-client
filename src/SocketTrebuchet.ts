import Trebuchet, {Data, Events, TREBUCHET_WS} from './Trebuchet'

interface MessageEvent {
  data: Data
}

export interface WSSettings {
  url: string
  timeout?: number
}

class SocketTrebuchet extends Trebuchet {
  ws!: WebSocket
  private readonly url: string
  private lastKeepAlive = Date.now()

  constructor (settings: WSSettings) {
    super(settings)
    this.url = settings.url
    this.setup()
  }

  private keepAlive () {
    const now = Date.now()
    // no need to start a new timeout if we just started one
    if (this.lastKeepAlive > now - this.timeout / 10) return
    this.lastKeepAlive = now
    clearTimeout(this.keepAliveTimeoutId)
    // per the protocol, the server sends a ping every 10 seconds
    // if it takes more than 5 seconds to receive that ping, something is wrong
    this.keepAliveTimeoutId = window.setTimeout(() => {
      this.keepAliveTimeoutId = undefined
      this.ws.close(1000)
    }, this.timeout * 1.5)
  }

  protected setup () {
    this.ws = new WebSocket(this.url, TREBUCHET_WS)
    this.ws.onopen = this.handleOpen.bind(this)

    this.ws.onmessage = (event: MessageEvent) => {
      const {data} = event
      if (data === Events.KEEP_ALIVE) {
        this.ws.send(Events.KEEP_ALIVE)
      } else {
        this.emit(Events.DATA, data)
      }
      this.keepAlive()
    }

    this.ws.onerror = () => {
      if (this.canConnect === undefined) {
        this.canConnect = false
        this.emit(Events.TRANSPORT_SUPPORTED, false)
      }
    }

    this.ws.onclose = (event: CloseEvent) => {
      // if the user or the firewall caused the close, don't reconnect & don't announce the disconnect
      const {code} = event

      if (code === 1002 || code === 1011) {
        // protocol/auth errors are signs of malicious actors
        this.canConnect = false
      }
      if (!this.canConnect) return
      if (this.reconnectAttempts === 0) {
        // only send the message once per disconnect
        this.emit(Events.TRANSPORT_DISCONNECTED)
      }
      this.tryReconnect()
    }
  }

  send = (message: Data) => {
    if (this.ws.readyState === this.ws.OPEN) {
      this.ws.send(message)
    } else {
      this.messageQueue.add(message)
    }
  }

  close (reason?: string) {
    // called by the user, so we know it's intentional
    this.canConnect = false
    this.messageQueue.clear()
    this.ws.close(1000, reason)
    this.emit(Events.CLOSE, reason)
  }
}

export default SocketTrebuchet
