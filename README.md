# trebuchet-client

A friendly siege weapon to get 2-way communication through tough firewalls and bad mobile networks

## Why?

Because "IT professionals" who believe they can secure their company by blocking WebSockets haven't retired yet.

## What's it do?

- Establishes a 2-way communication with a client no matter what
- Uses a heartbeat to keep the connection open
- Creates a new connection if a firewall ends a long-running connection or the server restarts
- Queues unsent messages
- Provides a clean API to let the user know they've been disconnected or reconnected
- Supports WebSockets, WebRTC, and SSE. SSE will always work (barring a MITM attack). See [Browser Support](#browser-support)
- Uses thunks for tree-shaking so you don't import trebuchets that you don't use
- Supports custom encoding (ie binary data) where possible (SSE does not support binary)

## Installation

`yarn add @mattkrick/trebuchet-client`

## API

- `getTrebuchet(thunks)`: given an array of trebuchets, it tries them in order & returns the first that works
- `SocketTrebuchet({url, encode, decode, batchDelay})`: a constructor to establish a websocket connection
  - `encode`: An encoding mechanism, defaults to `JSON.stringify`
  - `decode`: A decoding mechanism, defaults to `JSON.parse`
  - `batchDelay`: default is `-1` (no delay), pass `0` or higher to wrap in a `setTimeout` (`0` waits until next tick, highly recommended, if the server supports it)
- `SSETrebuchet({url, fetchData, fethcPing})`: a constructor to establish server-sent events
- `WRTCTrebuchet({url, fetchSignalServer})`: a constructor to establish a peer connection with the server

## Example

```js
import getTrebuchet, {SocketTrebuchet, SSETrebuchet, WRTCTrebuchet} from '@mattkrick/trebuchet-client'


const trebuchets = [
  () => new SocketTrebuchet({url: 'wss://my-server.co', enocde: msgpack.encode, decode: msgpack.decode, batchDelay: 10}),
  () => {
    const url = 'https://my-server.co'
    const fetchPing = (connectionId) => fetch(`/sse/?ping=true&id=${connectionId}`)
    const fetchData = (data, connectionId) => fetch('/dataRoute', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-correlation-id': connectionId || ''
      },
      body: JSON.stringify(data)
    })
    return new SSETrebuchet({url, fetchData, fetchPing})
  },
  () => {
    const fetchSignalServer = (signal) => fetch(`/rtc`, {method: 'POST', body: JSON.stringify(signal)})
    return new WRTCTrebuchet({fetchSignalServer})
  }
]

const siege = async () => {
  const trebuchet = await getTrebuchet(trebuchets)
  if (trebuchet) {
    trebuchet.send('it works!')
    trebuchet.on('data', () => {
      console.log('the walls have fallen')
    })
    trebuchet.on('disconnected', () => {
      console.log('the firewall tore us apart')
    })
    trebuchet.on('reconnected', () => {
      console.log('but our bond cannot be broken')
    })
    trebuchet.on('close', ({code, reason, isClientClose}) => {
      if (!isClientClose) {
        console.log(`I lied. It's not you, it's the server: ${reason}`)
      }
    })
  } else {
    console.log('the siege failed, try adding more trebuchets!')
  }
}
```

## Browser Support
Some browsers, namely IE11 and Edge, do not support EventSource (SSE) natively.
To fix that, you'll need to polyfill it. See @mattkrick/event-source-polyfill.
