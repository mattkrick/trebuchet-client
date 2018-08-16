import Backoff from 'backo2'
import EventEmitter from 'eventemitter3'
import {
  DATA,
  Data,
  KEEP_ALIVE,
  MAX_INT,
  TRANSPORT_CONNECTED,
  TRANSPORT_DISCONNECTED,
  TRANSPORT_RECONNECTED,
  TRANSPORT_SUPPORTED,
  TrebuchetEmitter
} from './getTrebuchet'

import FastRTCPeer, {DATA_CLOSE, DATA_OPEN, DataPayload, DispatchPayload, ERROR, SIGNAL} from '@mattkrick/fast-rtc-peer'

export type FetchSignalServer = (signal: DispatchPayload) => Promise<DispatchPayload | null>

export interface WRTCSettings {
  fetchSignalServer: FetchSignalServer
  rtcConfig: RTCConfiguration
  timeout?: number
}

class SocketTrebuchet extends (EventEmitter as TrebuchetEmitter) {
  peer!: FastRTCPeer
  private readonly backoff: Backoff = new Backoff({jitter: 0.5, min: 1000})
  private readonly timeout: number
  private readonly rtcConfig: RTCConfiguration
  private readonly fetchSignalServer: FetchSignalServer
  private unsentMessagesQueue: Array<Data> = []
  private canConnect: boolean | undefined = undefined
  private isReconnecting: boolean = false
  private isTerminal: boolean = false
  private reconnectTimeoutId: number | undefined
  private keepAliveTimeoutId: number | undefined

  constructor (settings: WRTCSettings) {
    super()
    this.timeout = settings.timeout || 10000
    this.fetchSignalServer = settings.fetchSignalServer
    this.rtcConfig = settings.rtcConfig || {}
    this.setupPeer()
  }

  private flushUnsentMessagesQueue () {
    this.unsentMessagesQueue.forEach((message) => {
      this.send(message)
    })
    this.unsentMessagesQueue.length = 0
  }

  private responseToKeepAlive () {
    this.peer.send(KEEP_ALIVE)
    if (!this.timeout || this.timeout > MAX_INT) return
    clearTimeout(this.keepAliveTimeoutId)
    // the server sends a message every 10 seconds
    // the client will close if it does not receive a message in 15 seconds after the last was received
    this.keepAliveTimeoutId = window.setTimeout(this.peer.close(), this.timeout * 1.5)
  }

  private setupPeer () {
    this.peer = new FastRTCPeer({isOfferer: true, ...this.rtcConfig})
    this.peer.on(SIGNAL, async (signal) => {
      const result = await this.fetchSignalServer(signal)
      if (result) {
        this.peer.dispatch(result)
      }
    })

    this.peer.on(DATA_OPEN, () => {
      const transportMessage = this.isReconnecting ? TRANSPORT_RECONNECTED : TRANSPORT_CONNECTED
      if (!this.isReconnecting) {
        this.canConnect = true
        this.emit(TRANSPORT_SUPPORTED, true)
      }
      this.isReconnecting = false
      this.backoff.reset()
      this.flushUnsentMessagesQueue()
      this.emit(transportMessage)
    })

    this.peer.on(ERROR, () => {
      if (this.canConnect === undefined) {
        this.canConnect = false
        this.emit(TRANSPORT_SUPPORTED, false)
      }
    })

    this.peer.on(DATA, (data) => {
      if (data === KEEP_ALIVE) {
        this.responseToKeepAlive()
      } else {
        this.emit(DATA, data)
      }
    })

    this.peer.on(DATA_CLOSE, () => {
      // if the user or the firewall caused the close, don't reconnect & don't announce the disconnect
      if (this.isTerminal || !this.canConnect) return
      if (!this.isReconnecting) {
        this.emit(TRANSPORT_DISCONNECTED)
      }
      this.tryReconnect()
    })
  }

  private tryReconnect () {
    if (this.isTerminal) return
    if (!this.isReconnecting) {
      this.setupPeer()
    } else if (!this.reconnectTimeoutId) {
      this.reconnectTimeoutId = window.setTimeout(() => {
        this.reconnectTimeoutId = undefined
        this.setupPeer()
      }, this.backoff.duration())
    }
  }

  send (message: Data) {
    if (this.peer.peerConnection.iceConnectionState === 'connected') {
      // TODO no casting
      this.peer.send(message as DataPayload)
    } else {
      this.unsentMessagesQueue.push(message)
    }
  }

  close () {
    this.isTerminal = true
    this.unsentMessagesQueue.length = 0
    this.peer.close()
  }

  async isSupported () {
    if (this.canConnect !== undefined) return this.canConnect
    return new Promise<boolean>((resolve) => {
      super.once(TRANSPORT_SUPPORTED, resolve)
    })
  }
}

export default SocketTrebuchet
