# trebuchet-client

A friendly siege weapon to get 2-way communication through tough firewalls and bad mobile networks

## Why?

Because "IT professionals" who believe they can secure their company by blocking WebSockets haven't retired yet.

## What's it do?

- Establishes a 2-way communication with a client no matter what
- Uses a heartbeat to keep the connection open
- Creates a new connection if a firewall ends a long-running connection
- Queues unsent messages
- Provides a clean API to let the user know they've been disconnected or reconnected
- Supports WebSockets, WebRTC, and SSE. SSE will always work (see [Browser Support](#browser-support))
- Uses thunks for tree-shaking so you don't import trebuchets that you don't use
- Supports buffers, in case you don't want to use simple, understandable JSON

## Installation

`yarn add @mattkrick/trebuchet-client`

## API

- `getTrebuchet(thunks)`: given an array of trebuchets, it tries them in order & returns the first that works
- `SocketTrebuchet({url})`: a constructor to establish a websocket connection
- `SSETrebuchet({url, fetchData, fethcPing})`: a constructor to establish server-sent events
- `WRTCTrebuchet({url, fetchSignalServer})`: a constructor to establish a peer connection with the server

## Example

```js
import getTrebuchet, {SocketTrebuchet, SSETrebuchet, WRTCTrebuchet} from '@mattkrick/trebuchet-client'


const trebuchets = [
  () => new SocketTrebuchet({url: 'wss://my-server.co'}),
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
