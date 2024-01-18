"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TREBUCHET_WS = void 0;
const tslib_1 = require("tslib");
const Trebuchet_1 = tslib_1.__importDefault(require("./Trebuchet"));
const PING = 57;
const PONG = new Uint8Array([65]);
const MAX_MID = 2 ** 31 - 1;
const MAX_IGNORE_LEN = 1000;
exports.TREBUCHET_WS = 'trebuchet-ws';
const isPing = (data) => {
    if (typeof data === 'string')
        return false;
    const buffer = new Uint8Array(data);
    return buffer.length === 1 && buffer[0] === PING;
};
const defaultDecode = (msg) => {
    const parsedData = JSON.parse(msg);
    if (!Array.isArray(parsedData))
        return { message: parsedData };
    const [message, mid] = parsedData;
    return { message, mid };
};
class SocketTrebuchet extends Trebuchet_1.default {
    ws;
    getUrl;
    encode;
    decode;
    mqTimer;
    constructor(settings) {
        super(settings);
        const { decode, encode } = settings;
        this.encode = encode || JSON.stringify;
        this.decode = decode || defaultDecode;
        this.getUrl = settings.getUrl;
        this.setup();
    }
    keepAlive() {
        // this.lastKeepAlive = now
        clearTimeout(this.keepAliveTimeoutId);
        // per the protocol, the server sends a ping every 10 seconds
        // if it takes more than 5 seconds to receive that ping, something is wrong
        this.keepAliveTimeoutId = window.setTimeout(() => {
            this.keepAliveTimeoutId = undefined;
            this.ws.close(1000);
        }, this.timeout * 1.5);
    }
    sendAck(mid) {
        const ack = new Uint8Array(4);
        const view = new DataView(ack.buffer);
        // first bit is a 0 if ACK
        const ackId = mid << 1;
        // guarantee little endian
        view.setUint32(0, ackId, true);
        this.ws.send(ack);
    }
    sendReq(mid) {
        const req = new Uint8Array(4);
        const view = new DataView(req.buffer);
        // first bit is 0 if REQ
        const reqId = (mid << 1) | 1;
        view.setUint32(0, reqId, true);
        this.ws.send(req);
    }
    releaseNextRobustMessage() {
        const nextId = this.lastMid + 1;
        const message = this.robustQueue[nextId];
        if (!message) {
            // we're all caught up!
            this.requestedMids.length = 0;
            return;
        }
        delete this.robustQueue[nextId];
        this.lastMid = nextId;
        this.emit('data', message);
        this.releaseNextRobustMessage();
    }
    setup() {
        this.ws = new WebSocket(this.getUrl(), exports.TREBUCHET_WS);
        this.ws.binaryType = 'arraybuffer';
        this.ws.onopen = this.handleOpen.bind(this);
        this.ws.onmessage = (event) => {
            const { data } = event;
            if (isPing(data)) {
                this.keepAlive();
                this.ws.send(PONG);
            }
            else {
                const { message, mid } = this.decode(data);
                if (!message)
                    return;
                // handle non-reliable messages
                if (typeof mid !== 'number' || mid > MAX_MID || mid < 0) {
                    this.emit('data', message);
                    return;
                }
                // ignore mids that were already requested & processed
                if (this.midsToIgnore.includes(mid))
                    return;
                // TCP guarantees AT MOST ONCE
                // if a mid is requested, then the delivery guarantee becomes AT LEAST ONCE, so we need to ignore dupes
                if (this.requestedMids.includes(mid)) {
                    this.midsToIgnore.push(mid);
                    if (this.midsToIgnore.length > MAX_IGNORE_LEN) {
                        this.midsToIgnore.splice(0, 1);
                    }
                }
                this.sendAck(mid);
                if (this.lastMid + 1 === mid) {
                    // get next in order
                    this.lastMid = mid;
                    this.emit('data', message);
                    this.releaseNextRobustMessage();
                    return;
                }
                // a missing message was detected!
                this.robustQueue[mid] = message;
                // request the first missing message (could get called multiple times)
                const missingMid = this.lastMid + 1;
                this.sendReq(missingMid);
                this.requestedMids.push(missingMid);
            }
        };
        this.ws.onerror = () => {
            // connection could get rejected after established due to changing server secret, etc.
            if (this.canConnect !== false) {
                this.canConnect = false;
                this.emit('supported', false);
            }
        };
        this.ws.onclose = (event) => {
            // if the user or the firewall caused the close, don't reconnect & don't announce the disconnect
            const { code, reason } = event;
            if (reason) {
                // if there's a reason to close, keep it closed
                this.canConnect = false;
            }
            this.emit('close', { code, reason });
            if (this.canConnect) {
                if (this.reconnectAttempts === 0) {
                    // only send the message once per disconnect
                    this.emit('disconnected');
                }
                this.tryReconnect();
            }
        };
    }
    send = (message) => {
        if (this.batchDelay === -1) {
            if (this.ws.readyState === this.ws.OPEN) {
                this.ws.send(this.encode(message));
            }
            else {
                this.messageQueue.add(message);
            }
        }
        else {
            this.messageQueue.add(message);
            if (!this.mqTimer) {
                this.mqTimer = window.setTimeout(() => {
                    this.mqTimer = undefined;
                    const { queue } = this.messageQueue;
                    if (this.ws.readyState === this.ws.OPEN && queue.length > 0) {
                        this.messageQueue.clear();
                        const message = queue.length === 1 ? queue[0] : queue;
                        this.ws.send(this.encode(message));
                    }
                }, this.batchDelay);
            }
        }
    };
    close(reason) {
        // called by the user, so we know it's intentional
        this.messageQueue.clear();
        if (this.ws.readyState === this.ws.CLOSED)
            return;
        this.ws.close(1000, reason || 'clientClose');
    }
}
exports.default = SocketTrebuchet;
//# sourceMappingURL=SocketTrebuchet.js.map