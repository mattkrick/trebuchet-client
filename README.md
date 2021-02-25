# trebuchet-client

A friendly siege weapon to get 2-way communication through tough firewalls and bad mobile networks

## Why?

- "IT professionals" who believe they can secure their company by blocking WebSockets haven't retired yet.
- A WebSocket doesn't guarantee a long-lived connection.
- A WebSocket with a ping doesn't guarantee a message will get delivered.
## What's it do?

- Establishes a 2-way communication with a client no matter what
- Uses a heartbeat to keep the connection open
- Creates a new connection if closed without reason (e.g. a firewall ends a long-running connection or the server restarts)
- Stop future connections if closed with reason (e.g. kicked off, blacklisted in real-time, etc.)
- Queues unsent messages
- Provides a clean API to let the user know they've been disconnected or reconnected
- Supports WebSockets, WebRTC, and SSE. SSE will always work (barring a MITM attack). See [Browser Support](#browser-support)
- Uses thunks for tree-shaking so you don't import trebuchets that you don't use
- Supports custom encoding (ie binary data) where possible (SSE does not support binary)
- Supports reliable messaging so you can be sure clients get the message

## Installation

`yarn add @mattkrick/trebuchet-client`

## API

- `getTrebuchet(thunks)`: given an array of trebuchets, it tries them in order & returns the first that works
- `SocketTrebuchet({getUrl, encode, decode, batchDelay})`: a constructor to establish a websocket connection
  - `encode`: An encoding mechanism, defaults to `JSON.stringify`
  - `decode`: A decoding mechanism, defaults to `JSON.parse`
  - `batchDelay`: default is `-1` (no delay), pass `0` or higher to wrap in a `setTimeout` (`0` waits until next tick, highly recommended, if the server supports it)
- `SSETrebuchet({getUrl, fetchData, fethcPing, fetchReliable})`: a constructor to establish server-sent events

## Example

```js
import getTrebuchet, {SocketTrebuchet, SSETrebuchet, WRTCTrebuchet} from '@mattkrick/trebuchet-client'

const trebuchets = [
  () => new SocketTrebuchet({getUrl:  () => 'wss://my-server.co', enocde: msgpack.encode, decode: msgpack.decode, batchDelay: 10}),
  () => {
    const getUrl = () => 'https://my-server.co'
    const fetchReliable = (connectionId, data) => fetch(`/sse/?reliable=true&id=${connectionId}`)
    const fetchPing = (connectionId) => fetch(`/sse/?ping=true&id=${connectionId}`)
    const fetchData = (data, connectionId) => fetch('/dataRoute', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-correlation-id': connectionId || ''
      },
      body: JSON.stringify(data)
    })
    return new SSETrebuchet({getUrl, fetchData, fetchPing, fetchReliable})
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
    trebuchet.on('close', ({code, reason}) => {
      if (reason) {
        console.log(`I lied. It's not you, it's the server: ${reason}`)
      }
    })
  } else {
    console.log('the siege failed, try adding more trebuchets!')
  }
}
```

## Details
- The ping is a single byte arraybuffer sent from the server. The client must reply within 10 seconds
- Reliable messages include an ACK and REQ which are 4 byte payloads each.
  - If the server sends a reliable message, it will include a message id. The client will reply with an ACK that includes the message id.
  - If the id is not the previous id + 1, the client will queue that message & send a REQ for the first missing message. This guarantees message ordering.
## Browser Support
Some browsers, namely IE11 and Edge, do not support EventSource (SSE) natively.
To fix that, you'll need to polyfill it. See @mattkrick/event-source-polyfill.
