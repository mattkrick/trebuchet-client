# trebuchet-client

A friendly siege weapon to get 2-way communication through tough firewalls and bad mobile networks

## Why?

Because "IT professionals" who believe they can secure their company by blocking WebSockets haven't retired yet.

## What's it do?

- Establishes a 2-way communication with a client no matter what
- Uses a heartbeat to keep the connection open
- Creates a new connection if a firewall ends a long-running connection
- Queues unsent messages created during the disconnect
- Provides a clean API to let the user know they've been disconnected or reconnected
- Supports WebSockets, SSE, WebRTC, and (ugh) polling.
- Uses thunks for tree-shaking so you don't import trebuchets that you don't use
- Supports buffers, in case you don't want to use simple, understandable JSON

## API

- `getTrebuchet(thunks)`: return the best `trebuchet` to communicate with the server
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
    const fetchData = (connectionId, data) => fetch('/dataRoute', {
      method: 'POST',
      body: JSON.stringify(data)
    })
    return new SSETrebuchet({url, fetchData, fetchPing})
  },
  () => {
    const fetchSignalServer = (data) => fetch(`/rtc`, method: 'POST', body: JSON.stringify(data))
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
  } else {
    console.log('the siege failed, try adding more trebuchets!')
  }
}
```
