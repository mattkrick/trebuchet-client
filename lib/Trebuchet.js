"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const eventemitter3_1 = tslib_1.__importDefault(require("eventemitter3"));
const MessageQueue_1 = tslib_1.__importDefault(require("./MessageQueue"));
class Trebuchet extends eventemitter3_1.default {
    backoff = [1000, 2000, 5000, 10000];
    timeout;
    batchDelay;
    messageQueue = new MessageQueue_1.default();
    canConnect = undefined;
    reconnectAttempts = 0;
    reconnectTimeoutId;
    keepAliveTimeoutId;
    lastMid = -1;
    robustQueue = {};
    midsToIgnore = [];
    requestedMids = [];
    constructor(settings) {
        super();
        this.timeout = settings.timeout || 10000;
        this.batchDelay = settings.batchDelay ?? -1;
    }
    handleOpen = () => {
        if (this.reconnectAttempts === 0) {
            this.canConnect = true;
            this.emit('supported', true);
            this.emit('connected');
        }
        else {
            this.reconnectAttempts = 0;
            this.emit('reconnected');
        }
        this.messageQueue.flush(this.send);
        this.lastMid = -1;
        this.robustQueue = {};
        this.midsToIgnore = [];
        this.requestedMids = [];
    };
    tryReconnect() {
        if (!this.canConnect)
            return;
        if (!this.reconnectTimeoutId) {
            const backoffInterval = Math.min(this.reconnectAttempts, this.backoff.length - 1);
            const delay = this.backoff[backoffInterval] + Math.random() * 500;
            this.reconnectTimeoutId = window.setTimeout(() => {
                this.reconnectTimeoutId = undefined;
                this.reconnectAttempts++;
                this.setup();
            }, delay);
        }
    }
    async isSupported() {
        if (this.canConnect !== undefined)
            return this.canConnect;
        return new Promise((resolve) => {
            this.once('supported', resolve);
        });
    }
}
exports.default = Trebuchet;
//# sourceMappingURL=Trebuchet.js.map