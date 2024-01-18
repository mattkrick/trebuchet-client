"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const Trebuchet_1 = tslib_1.__importDefault(require("./Trebuchet"));
const MAX_INT = 2 ** 31 - 1;
const MAX_MID = 2 ** 31 - 1;
const MAX_IGNORE_LEN = 1000;
const decode = (msg) => {
    const parsedData = JSON.parse(msg);
    if (!Array.isArray(parsedData))
        return { message: parsedData };
    const [message, mid] = parsedData;
    return { message, mid };
};
class SSETrebuchet extends Trebuchet_1.default {
    source;
    getUrl;
    fetchData;
    fetchPing;
    fetchReliable;
    connectionId = undefined;
    constructor(settings) {
        super(settings);
        this.getUrl = settings.getUrl;
        this.fetchData = settings.fetchData;
        this.fetchPing = settings.fetchPing;
        this.fetchReliable = settings.fetchReliable;
        this.setup();
    }
    sendAck(mid) {
        const ack = new Uint8Array(4);
        const view = new DataView(ack.buffer);
        // first bit is a 0 if ACK
        const ackId = mid << 1;
        // guarantee little endian
        view.setUint32(0, ackId, true);
        this.reply(ack);
    }
    sendReq(mid) {
        const req = new Uint8Array(4);
        const view = new DataView(req.buffer);
        // first bit is 0 if REQ
        const reqId = (mid << 1) | 1;
        view.setUint32(0, reqId, true);
        this.reply(req);
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
    setup = () => {
        this.source = new EventSource(this.getUrl());
        this.source.onopen = this.handleOpen.bind(this);
        this.source.onerror = () => {
            this.connectionId = undefined;
            if (this.canConnect === undefined) {
                this.canConnect = false;
                // keep it from reconnecting
                this.source.close();
                this.emit('supported', false);
            }
            else if (this.canConnect) {
                if (this.reconnectAttempts === 0) {
                    // only send the message once per disconnect
                    this.emit('disconnected');
                }
                // EventSources have a built-in retry protocol, we'll just use that
                this.reconnectAttempts++;
            }
        };
        this.source.addEventListener('ka', () => {
            if (!this.connectionId || !this.timeout || this.timeout > MAX_INT)
                return;
            this.fetchPing(this.connectionId).catch();
            clearTimeout(this.keepAliveTimeoutId);
            this.keepAliveTimeoutId = window.setTimeout(() => {
                this.keepAliveTimeoutId = undefined;
                this.source.close();
                this.emit('disconnected');
                this.reconnectAttempts++;
                this.setup();
            }, this.timeout * 1.5);
        });
        this.source.addEventListener('id', (event) => {
            this.connectionId = event.data;
            this.messageQueue.flush(this.send);
        });
        this.source.addEventListener('close', (event) => {
            const splitIdx = event.data.indexOf(':');
            const code = event.data.slice(0, splitIdx);
            const reason = event.data.slice(splitIdx + 1);
            this.emit('close', { code, reason });
            this.source.close();
        });
        this.source.onmessage = (event) => {
            const { message, mid } = decode(event.data);
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
        };
    };
    handleFetch = async (message) => {
        const res = await this.fetchData(message, this.connectionId);
        if (res) {
            this.emit('data', res);
        }
    };
    send = (message) => {
        if (this.source.readyState === this.source.OPEN && this.connectionId) {
            this.handleFetch(message).catch();
        }
        else {
            this.messageQueue.add(message);
        }
    };
    reply = (data) => {
        if (this.source.readyState === this.source.OPEN && this.connectionId && this.fetchReliable) {
            this.fetchReliable(this.connectionId, data).catch();
        }
    };
    close(reason) {
        this.messageQueue.clear();
        if (this.source.CLOSED)
            return;
        // called by the user, so we know it's intentional
        this.canConnect = false;
        this.source.close();
        this.emit('close', { code: 1000, reason });
    }
}
exports.default = SSETrebuchet;
//# sourceMappingURL=SSETrebuchet.js.map