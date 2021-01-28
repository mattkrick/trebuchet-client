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
const ACK_PREFIX = 6
const MAX_MESSAGE_ID = 128
export const TREBUCHET_WS = 'trebuchet-ws'

const isPing = (data: Data) => {
  if (typeof data === 'string') return false
  const buffer = new Uint8Array(data)
  return buffer.length === 1 && buffer[0] === PING
}

class SocketTrebuchet extends Trebuchet {
  ws!: WebSocket
  private lastReliableSynId!: number
  private reliableMessageQueue!: any[]
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

  private respondToReliableMessage (decodedData: any) {
    const synId = decodedData.synId
    this.ws.send(new Uint8Array([ACK_PREFIX, decodedData.synId]))
    this.lastReliableSynId = synId === MAX_MESSAGE_ID - 1 ? -1 : synId
    this.emit('data', decodedData.object)
  }

  private processReliableMessageInOrder (decodedData: any) {
    const synId = decodedData.synId
    this.reliableMessageQueue
      .filter((_data, idx) => idx < synId)
      .forEach((data, idx) => {
        this.respondToReliableMessage(data)
        delete this.reliableMessageQueue[idx]
      })
    this.respondToReliableMessage(decodedData)
  }

  protected setup () {
    this.ws = new WebSocket(this.getUrl(), TREBUCHET_WS)
    this.ws.binaryType = 'arraybuffer'
    this.ws.onopen = this.handleOpen.bind(this)
    this.lastReliableSynId = -1
    this.reliableMessageQueue = []

    this.ws.onmessage = (event: MessageEvent) => {
      const {data} = event
      if (isPing(data)) {
        this.keepAlive()
        this.ws.send(PONG)
      } else {
        const decodedData = this.decode(data)
        const synId = decodedData.synId
        if (synId !== undefined) {
          if (
            this.lastReliableSynId + 1 === synId ||
            (this.lastReliableSynId + 1 === MAX_MESSAGE_ID && synId === 0)
          ) {
            this.processReliableMessageInOrder(decodedData)
          } else {
            this.reliableMessageQueue[synId] = decodedData
          }
        } else {
          this.emit('data', decodedData)
        }
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
