import EventEmitter from 'eventemitter3'
import MessageQueue from './MessageQueue'
import StrictEventEmitter from 'strict-event-emitter-types'

export interface TrebuchetSettings {
  timeout?: number
}

export enum Events {
  KEEP_ALIVE = 'ka',
  DATA = 'data',
  CLOSE = 'close',
  TRANSPORT_SUPPORTED = 'supported',
  TRANSPORT_CONNECTED = 'connected',
  TRANSPORT_RECONNECTED = 'reconnected',
  TRANSPORT_DISCONNECTED = 'disconnected',
}

interface TrebuchetEvents {
  [Events.CLOSE]: string | undefined,
  [Events.DATA]: Data | object,
  [Events.KEEP_ALIVE]: void,
  [Events.TRANSPORT_CONNECTED]: void,
  [Events.TRANSPORT_RECONNECTED]: void,
  [Events.TRANSPORT_DISCONNECTED]: void,
  [Events.TRANSPORT_SUPPORTED]: boolean,
}

export const MAX_INT = 2 ** 31 - 1
export const TREBUCHET_WS = 'trebuchet-ws'
export const SSE_ID = 'id'

export type Data = string | ArrayBufferLike | Blob | ArrayBufferView

export type TrebuchetEmitter = {new (): StrictEventEmitter<EventEmitter, TrebuchetEvents>}

abstract class Trebuchet extends (EventEmitter as TrebuchetEmitter) {
  protected readonly backoff: Array<number> = [1000, 2000, 5000, 10000]
  protected readonly timeout: number
  protected messageQueue: MessageQueue
  protected canConnect: boolean | undefined = undefined
  protected reconnectAttempts: number = 0
  protected reconnectTimeoutId: number | undefined
  protected keepAliveTimeoutId: number | undefined

  constructor (settings: TrebuchetSettings) {
    super()
    this.timeout = settings.timeout || 10000
    this.messageQueue = new MessageQueue()
  }

  abstract close(reason?: string): void
  abstract send (message: Data): void

  protected abstract setup (): void

  protected handleOpen = () => {
    if (this.reconnectAttempts === 0) {
      this.canConnect = true
      this.emit(Events.TRANSPORT_SUPPORTED, true)
      this.emit(Events.TRANSPORT_CONNECTED)
    } else {
      this.reconnectAttempts = 0
      this.emit(Events.TRANSPORT_RECONNECTED)
    }
    this.messageQueue.flush(this.send)
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
      this.once(Events.TRANSPORT_SUPPORTED, resolve)
    })
  }
}

export default Trebuchet
