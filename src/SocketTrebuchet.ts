import Trebuchet, {Data, TrebuchetSettings} from './Trebuchet'

type Encode = (msg: any) => Data
type Decode = (msg: any) => any

export interface WSSettings extends TrebuchetSettings {
  getUrl: () => string
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
  private readonly getUrl: () => string
  private encode: Encode
  private decode: Decode
  private mqTimer: number | undefined
  constructor (settings: WSSettings) {
    super(settings)
    const {decode, encode} = settings
    this.encode = encode || JSON.stringify
    this.decode = decode || JSON.parse
    this.getUrl = settings.getUrl
    this.setup()
  }

  private keepAlive () {
    // this.lastKeepAlive = now
    clearTimeout(this.keepAliveTimeoutId)
    // per the protocol, the server sends a ping every 10 seconds
    // if it takes more than 5 seconds to receive that ping, something is wrong
    this.keepAliveTimeoutId = window.setTimeout(() => {
      this.keepAliveTimeoutId = undefined
      this.ws.close(1000)
    }, this.timeout * 1.5)
  }

  protected setup () {
    this.ws = new WebSocket(this.getUrl(), TREBUCHET_WS)
    this.ws.binaryType = 'arraybuffer'
    this.ws.onopen = this.handleOpen.bind(this)

    this.ws.onmessage = (event: MessageEvent) => {
      const {data} = event
      if (isPing(data)) {
        this.keepAlive()
        this.ws.send(PONG)
      } else {
        this.emit('data', this.decode(data))
      }
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
      if (reason) {
        // if there's a reason to close, keep it closed
        this.canConnect = false
      }
      this.emit('close', {code, reason})
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
    // called by the user, so we know it's intentional
    this.messageQueue.clear()
    if (this.ws.readyState === this.ws.CLOSED) return
    this.ws.close(1000, reason || 'clientClose')
  }
}

export default SocketTrebuchet
