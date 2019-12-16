import Trebuchet, {Data, TrebuchetSettings} from './Trebuchet'

type Encode = (msg: any) => Data
type Decode = (msg: any) => any

export interface WSSettings extends TrebuchetSettings {
  url: string
  encode?: Encode
  decode?: Decode
}

const PING = 57
const PONG = new Uint8Array([65])
export const TREBUCHET_WS = 'trebuchet-ws'

const isPing = (data: Data) => {
  if (typeof data === 'string') return false
  const buffer = new Uint8Array(data)
  return buffer.length === 1 && buffer[0] === PING
}

class SocketTrebuchet extends Trebuchet {
  ws!: WebSocket
  private readonly url: string
  private lastKeepAlive = Date.now()
  private isClientClose?: boolean
  private encode: Encode
  private decode: Decode
  private mqTimer: number | undefined
  constructor (settings: WSSettings) {
    super(settings)
    const {decode, encode} = settings
    this.encode = encode || JSON.stringify
    this.decode = decode || JSON.parse
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
      this.ws.close(1000, 'ping timeout')
    }, this.timeout * 1.5)
  }

  protected setup () {
    this.ws = new WebSocket(this.url, TREBUCHET_WS)
    this.ws.binaryType = 'arraybuffer'
    this.ws.onopen = this.handleOpen.bind(this)

    this.ws.onmessage = (event: MessageEvent) => {
      const {data} = event
      if (isPing(data)) {
        this.ws.send(PONG)
      } else {
        this.emit('data', this.decode(data))
      }
      this.keepAlive()
    }

    this.ws.onerror = () => {
      if (this.canConnect === undefined) {
        this.canConnect = false
        this.emit('supported', false)
      }
    }

    this.ws.onclose = (event: CloseEvent) => {
      // if the user or the firewall caused the close, don't reconnect & don't announce the disconnect
      const {code, reason} = event
      const isClientClose = !!this.isClientClose
      if (!isClientClose) {
        // if the server closed the connection, don't try to reconnect
        this.canConnect = false
      }
      this.emit('close', {code, reason, isClientClose})
      if (this.canConnect) {
        if (this.reconnectAttempts === 0) {
          // only send the message once per disconnect
          this.emit('disconnected')
        }
        this.tryReconnect()
      }
    }
  }

  send = (message: any) => {
    if (this.batchDelay === -1) {
      if (this.ws.readyState === this.ws.OPEN) {
        this.ws.send(this.encode(message))
      } else {
        this.messageQueue.add(message)
      }
    } else {
      this.messageQueue.add(message)
      if (!this.mqTimer) {
        this.mqTimer = window.setTimeout(() => {
          this.mqTimer = undefined
          const {queue} = this.messageQueue
          if (this.ws.readyState === this.ws.OPEN && queue.length > 0) {
            this.messageQueue.clear()
            const message = queue.length === 1 ? queue[0] : queue
            this.ws.send(this.encode(message))
          }
        }, this.batchDelay)
      }
    }
  }

  close (reason?: string) {
    if (this.ws.readyState === this.ws.CLOSED) return
    // called by the user, so we know it's intentional
    this.isClientClose = true
    this.canConnect = false
    this.messageQueue.clear()
    this.ws.close(1000, reason)
  }
}

export default SocketTrebuchet
