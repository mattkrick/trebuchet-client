import FastRTCPeer, {
  DATA,
  DATA_CLOSE,
  DATA_OPEN,
  DataPayload,
  DispatchPayload,
  ERROR,
  SIGNAL
} from '@mattkrick/fast-rtc-peer'
import Trebuchet, {Data, TrebuchetSettings} from './Trebuchet'

export type FetchSignalServer = (signal: DispatchPayload) => Promise<DispatchPayload | null>

export interface WRTCSettings extends TrebuchetSettings {
  fetchSignalServer: FetchSignalServer
  rtcConfig: RTCConfiguration
}

const MAX_INT = 2 ** 31 - 1
class WRTCTrebuchet extends Trebuchet {
  peer!: FastRTCPeer
  private readonly rtcConfig: RTCConfiguration
  private readonly fetchSignalServer: FetchSignalServer

  constructor (settings: WRTCSettings) {
    super(settings)
    this.fetchSignalServer = settings.fetchSignalServer
    this.rtcConfig = settings.rtcConfig || {}
    this.setup()
  }

  private responseToKeepAlive () {
    if (!this.timeout || this.timeout > MAX_INT) return
    this.peer.send('ka')
    clearTimeout(this.keepAliveTimeoutId)
    // per the protocol, the server sends a ping every 10 seconds
    // if it takes more than 5 seconds to receive that ping, something is wrong
    this.keepAliveTimeoutId = window.setTimeout(this.peer.close.bind(this.peer), this.timeout * 1.5)
  }

  protected setup () {
    this.peer = new FastRTCPeer({isOfferer: true, ...this.rtcConfig})
    this.peer.on(SIGNAL, async (signal: DispatchPayload) => {
      const result = await this.fetchSignalServer(signal)
      if (result) {
        this.peer.dispatch(result)
      }
    })

    this.peer.on(DATA_OPEN, this.handleOpen.bind(this))

    this.peer.on(ERROR, () => {
      if (this.canConnect === undefined) {
        this.canConnect = false
        this.emit('supported', false)
      }
    })

    this.peer.on(DATA, (data) => {
      if (data === 'ka') {
        this.responseToKeepAlive()
      } else {
        this.emit('data', data)
      }
    })

    this.peer.on(DATA_CLOSE, () => {
      // auth is taken care of by the signaling server
      if (!this.canConnect) return
      if (this.reconnectAttempts === 0) {
        // only send the message once per disconnect
        this.emit('disconnected')
      }
      this.tryReconnect()
    })
  }

  send (message: Data) {
    if (this.peer.peerConnection.iceConnectionState === 'connected') {
      this.peer.send(message as DataPayload)
    } else {
      this.messageQueue.add(message)
    }
  }

  close (reason?: string) {
    // called by the user, so we know it's intentional
    this.canConnect = false
    this.messageQueue.clear()
    this.peer.close()
    this.emit('close', {code: 1000, reason, isClientClose: true})
  }
}

export default WRTCTrebuchet
