import EventEmitter from 'eventemitter3'
import StrictEventEmitter from 'strict-event-emitter-types'
import MessageQueue from './MessageQueue'

export interface TrebuchetSettings {
  timeout?: number
  batchDelay?: number
}

interface ClosePayload {
  code?: number
  reason?: string
}

interface TrebuchetEvents {
  close: ClosePayload
  data: object | string | boolean | number
  connected: void
  reconnected: void
  disconnected: void
  supported: boolean
}

export type Data = string | ArrayBufferLike

export type TrebuchetEmitter = {new (): StrictEventEmitter<EventEmitter, TrebuchetEvents>}

abstract class Trebuchet extends (EventEmitter as TrebuchetEmitter) {
  protected readonly backoff: Array<number> = [1000, 2000, 5000, 10000]
  protected readonly timeout: number
  protected readonly batchDelay: number
  protected messageQueue = new MessageQueue()
  protected canConnect: boolean | undefined = undefined
  protected reconnectAttempts = 0
  protected reconnectTimeoutId: number | undefined
  protected keepAliveTimeoutId: number | undefined
  protected lastMid = -1
  protected robustQueue = {} as {[mid: number]: any}
  protected midsToIgnore = [] as number[]
  protected requestedMids = [] as number[]
  constructor (settings: TrebuchetSettings) {
    super()
    this.timeout = settings.timeout || 10000
    this.batchDelay = settings.batchDelay ?? -1
  }

  abstract close (reason?: string): void
  abstract send (message: any): void

  protected abstract setup (): void

  protected handleOpen = () => {
    if (this.reconnectAttempts === 0) {
      this.canConnect = true
      this.emit('supported', true)
      this.emit('connected')
    } else {
      this.reconnectAttempts = 0
      this.emit('reconnected')
    }
    this.messageQueue.flush(this.send)
    this.lastMid = -1
    this.robustQueue = {}
    this.midsToIgnore = []
    this.requestedMids = []
  }

  protected tryReconnect () {
    if (!this.canConnect) return
    if (!this.reconnectTimeoutId) {
      const backoffInterval = Math.min(this.reconnectAttempts, this.backoff.length - 1)
      const delay = this.backoff[backoffInterval] + Math.random() * 500
      this.reconnectTimeoutId = window.setTimeout(() => {
        this.reconnectTimeoutId = undefined
        this.reconnectAttempts++
        this.setup()
      }, delay)
    }
  }

  async isSupported () {
    if (this.canConnect !== undefined) return this.canConnect
    return new Promise<boolean>((resolve) => {
      this.once('supported', resolve)
    })
  }
}

export default Trebuchet
