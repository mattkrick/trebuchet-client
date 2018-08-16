import SocketTrebuchet from './SocketTrebuchet'
import StrictEventEmitter from 'strict-event-emitter-types'
import EventEmitter from 'eventemitter3'
import SSETrebuchet from './SSETrebuchet'

export const KEEP_ALIVE = 'ka'
export const DATA = 'data'
export const CONNECTION_ERROR = 'connectionError'
export const CLOSE = 'close'
export const TRANSPORT_SUPPORTED = 'supported'
export const TRANSPORT_CONNECTED = 'connected'
export const TRANSPORT_RECONNECTED = 'reconnected'
export const TRANSPORT_DISCONNECTED = 'disconnected'
export const MAX_INT = 2 ** 31 - 1
export const TREBUCHET_WS = 'trebuchet-ws'
export const SSE_ID = 'id'

export type Data = string | ArrayBufferLike | Blob | ArrayBufferView

interface TrebuchetEvents {
  close: string | undefined,
  data: Data | object,
  ka: void,
  connected: void,
  reconnected: void,
  disconnected: void,
  supported: boolean
}

export type TrebuchetEmitter = {new (): StrictEventEmitter<EventEmitter, TrebuchetEvents>}

export type Trebuchet = SocketTrebuchet | SSETrebuchet

type TrebuchetThunk = () => Trebuchet

const getTrebuchet = async (thunks: Array<TrebuchetThunk>) => {
  for (let i = 0; i < thunks.length; i++) {
    const trebuchet = thunks[i]()
    if (await trebuchet.isSupported()) {
      return trebuchet
    }
  }
  return null
}

export default getTrebuchet
