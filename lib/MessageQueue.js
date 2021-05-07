"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class MessageQueue {
    constructor() {
        this.queue = [];
    }
    add(message) {
        this.queue.push(message);
    }
    clear() {
        this.queue = [];
    }
    flush(send) {
        const startingQueueLength = this.queue.length;
        this.queue.forEach((message) => {
            send(message);
        });
        // if flush is called before messages can be sent, they'll end up back in the queue. keep those.
        this.queue.splice(0, startingQueueLength);
    }
}
exports.default = MessageQueue;
//# sourceMappingURL=MessageQueue.js.map