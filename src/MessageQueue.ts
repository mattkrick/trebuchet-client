import {Data} from './Trebuchet'

export type SendFn = (message: Data) => void

class MessageQueue {
  queue: Array<Data> = []

  add (message: Data) {
    this.queue.push(message)
  }

  clear () {
    this.queue = []
  }

  flush (send: SendFn) {
    const startingQueueLength = this.queue.length
    this.queue.forEach((message) => {
      send(message)
    })
    // if flush is called before messages can be sent, they'll end up back in the queue. keep those.
    this.queue.splice(0, startingQueueLength)
  }
}

export default MessageQueue
