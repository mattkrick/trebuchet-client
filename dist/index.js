module.exports =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/index.ts");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/MessageQueue.ts":
/*!*****************************!*\
  !*** ./src/MessageQueue.ts ***!
  \*****************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
class MessageQueue {
    constructor() {
        this.queue = [];
    }
    add(message) {
        this.queue.push(message);
    }
    clear() {
        this.queue.length = 0;
    }
    flush(send) {
        const startingQueueLength = this.queue.length;
        this.queue.forEach((message) => {
            send(message);
        });
        this.queue.splice(0, startingQueueLength);
    }
}
/* harmony default export */ __webpack_exports__["default"] = (MessageQueue);


/***/ }),

/***/ "./src/SSETrebuchet.ts":
/*!*****************************!*\
  !*** ./src/SSETrebuchet.ts ***!
  \*****************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _Trebuchet__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Trebuchet */ "./src/Trebuchet.ts");

class SSETrebuchet extends _Trebuchet__WEBPACK_IMPORTED_MODULE_0__["default"] {
    constructor(settings) {
        super(settings);
        this.connectionId = undefined;
        this.setup = () => {
            this.source = new EventSource(this.url);
            this.source.onopen = this.handleOpen.bind(this);
            this.source.onerror = () => {
                this.connectionId = undefined;
                if (this.canConnect === undefined) {
                    this.canConnect = false;
                    this.source.close();
                    this.emit(_Trebuchet__WEBPACK_IMPORTED_MODULE_0__["Events"].TRANSPORT_SUPPORTED, false);
                }
                else if (this.canConnect) {
                    if (this.reconnectAttempts === 0) {
                        this.emit(_Trebuchet__WEBPACK_IMPORTED_MODULE_0__["Events"].TRANSPORT_DISCONNECTED);
                    }
                    this.reconnectAttempts++;
                }
            };
            this.source.addEventListener(_Trebuchet__WEBPACK_IMPORTED_MODULE_0__["Events"].KEEP_ALIVE, () => {
                if (!this.connectionId || !this.timeout || this.timeout > _Trebuchet__WEBPACK_IMPORTED_MODULE_0__["MAX_INT"])
                    return;
                this.fetchPing(this.connectionId).catch();
                clearTimeout(this.keepAliveTimeoutId);
                this.keepAliveTimeoutId = window.setTimeout(() => {
                    this.keepAliveTimeoutId = undefined;
                    this.source.close();
                    this.emit(_Trebuchet__WEBPACK_IMPORTED_MODULE_0__["Events"].TRANSPORT_DISCONNECTED);
                    this.reconnectAttempts++;
                    this.setup();
                }, this.timeout * 1.5);
            });
            this.source.addEventListener(_Trebuchet__WEBPACK_IMPORTED_MODULE_0__["SSE_ID"], (event) => {
                this.connectionId = event.data;
                this.messageQueue.flush(this.send);
            });
            this.source.addEventListener(_Trebuchet__WEBPACK_IMPORTED_MODULE_0__["SSE_CLOSE_EVENT"], (event) => {
                const splitIdx = event.data.indexOf(':');
                const code = event.data.slice(0, splitIdx);
                const reason = event.data.slice(splitIdx + 1);
                this.emit(_Trebuchet__WEBPACK_IMPORTED_MODULE_0__["Events"].CLOSE, { code, reason, isClientClose: false });
                this.source.close();
            });
            this.source.onmessage = (event) => {
                this.emit(_Trebuchet__WEBPACK_IMPORTED_MODULE_0__["Events"].DATA, event.data);
            };
        };
        this.handleFetch = async (message) => {
            const res = await this.fetchData(message, this.connectionId);
            if (res) {
                this.emit(_Trebuchet__WEBPACK_IMPORTED_MODULE_0__["Events"].DATA, res);
            }
        };
        this.send = (message) => {
            if (this.source.readyState === this.source.OPEN && this.connectionId) {
                this.handleFetch(message).catch();
            }
            else {
                this.messageQueue.add(message);
            }
        };
        this.url = settings.url;
        this.fetchData = settings.fetchData;
        this.fetchPing = settings.fetchPing;
        this.setup();
    }
    close(reason) {
        this.canConnect = false;
        this.messageQueue.clear();
        this.source.close();
        this.emit(_Trebuchet__WEBPACK_IMPORTED_MODULE_0__["Events"].CLOSE, { code: 1000, reason, isClientClose: true });
    }
}
/* harmony default export */ __webpack_exports__["default"] = (SSETrebuchet);


/***/ }),

/***/ "./src/SocketTrebuchet.ts":
/*!********************************!*\
  !*** ./src/SocketTrebuchet.ts ***!
  \********************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _Trebuchet__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Trebuchet */ "./src/Trebuchet.ts");

class SocketTrebuchet extends _Trebuchet__WEBPACK_IMPORTED_MODULE_0__["default"] {
    constructor(settings) {
        super(settings);
        this.lastKeepAlive = Date.now();
        this.send = (message) => {
            if (this.ws.readyState === this.ws.OPEN) {
                this.ws.send(message);
            }
            else {
                this.messageQueue.add(message);
            }
        };
        this.url = settings.url;
        this.setup();
    }
    keepAlive() {
        const now = Date.now();
        if (this.lastKeepAlive > now - this.timeout / 10)
            return;
        this.lastKeepAlive = now;
        clearTimeout(this.keepAliveTimeoutId);
        this.keepAliveTimeoutId = window.setTimeout(() => {
            this.keepAliveTimeoutId = undefined;
            this.ws.close(1000);
        }, this.timeout * 1.5);
    }
    setup() {
        this.ws = new WebSocket(this.url, _Trebuchet__WEBPACK_IMPORTED_MODULE_0__["TREBUCHET_WS"]);
        this.ws.onopen = this.handleOpen.bind(this);
        this.ws.onmessage = (event) => {
            const { data } = event;
            if (data === _Trebuchet__WEBPACK_IMPORTED_MODULE_0__["Events"].KEEP_ALIVE) {
                this.ws.send(_Trebuchet__WEBPACK_IMPORTED_MODULE_0__["Events"].KEEP_ALIVE);
            }
            else {
                this.emit(_Trebuchet__WEBPACK_IMPORTED_MODULE_0__["Events"].DATA, data);
            }
            this.keepAlive();
        };
        this.ws.onerror = () => {
            if (this.canConnect === undefined) {
                this.canConnect = false;
                this.emit(_Trebuchet__WEBPACK_IMPORTED_MODULE_0__["Events"].TRANSPORT_SUPPORTED, false);
            }
        };
        this.ws.onclose = (event) => {
            const { code, reason } = event;
            if (code === 1002 || code === 1011) {
                this.canConnect = false;
            }
            this.emit(_Trebuchet__WEBPACK_IMPORTED_MODULE_0__["Events"].CLOSE, { code, reason, isClientClose: !!this.isClientClose });
            if (this.canConnect) {
                if (this.reconnectAttempts === 0) {
                    this.emit(_Trebuchet__WEBPACK_IMPORTED_MODULE_0__["Events"].TRANSPORT_DISCONNECTED);
                }
                this.tryReconnect();
            }
        };
    }
    close(reason) {
        this.isClientClose = true;
        this.canConnect = false;
        this.messageQueue.clear();
        this.ws.close(1000, reason);
    }
}
/* harmony default export */ __webpack_exports__["default"] = (SocketTrebuchet);


/***/ }),

/***/ "./src/Trebuchet.ts":
/*!**************************!*\
  !*** ./src/Trebuchet.ts ***!
  \**************************/
/*! exports provided: Events, MAX_INT, TREBUCHET_WS, SSE_ID, SSE_CLOSE_EVENT, default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Events", function() { return Events; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "MAX_INT", function() { return MAX_INT; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "TREBUCHET_WS", function() { return TREBUCHET_WS; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "SSE_ID", function() { return SSE_ID; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "SSE_CLOSE_EVENT", function() { return SSE_CLOSE_EVENT; });
/* harmony import */ var eventemitter3__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! eventemitter3 */ "eventemitter3");
/* harmony import */ var eventemitter3__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(eventemitter3__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _MessageQueue__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./MessageQueue */ "./src/MessageQueue.ts");


var Events;
(function (Events) {
    Events["KEEP_ALIVE"] = "ka";
    Events["DATA"] = "data";
    Events["CLOSE"] = "close";
    Events["TRANSPORT_SUPPORTED"] = "supported";
    Events["TRANSPORT_CONNECTED"] = "connected";
    Events["TRANSPORT_RECONNECTED"] = "reconnected";
    Events["TRANSPORT_DISCONNECTED"] = "disconnected";
})(Events || (Events = {}));
const MAX_INT = 2 ** 31 - 1;
const TREBUCHET_WS = 'trebuchet-ws';
const SSE_ID = 'id';
const SSE_CLOSE_EVENT = 'close';
class Trebuchet extends eventemitter3__WEBPACK_IMPORTED_MODULE_0___default.a {
    constructor(settings) {
        super();
        this.backoff = [1000, 2000, 5000, 10000];
        this.canConnect = undefined;
        this.reconnectAttempts = 0;
        this.handleOpen = () => {
            if (this.reconnectAttempts === 0) {
                this.canConnect = true;
                this.emit(Events.TRANSPORT_SUPPORTED, true);
                this.emit(Events.TRANSPORT_CONNECTED);
            }
            else {
                this.reconnectAttempts = 0;
                this.emit(Events.TRANSPORT_RECONNECTED);
            }
            this.messageQueue.flush(this.send);
        };
        this.timeout = settings.timeout || 10000;
        this.messageQueue = new _MessageQueue__WEBPACK_IMPORTED_MODULE_1__["default"]();
    }
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
            this.once(Events.TRANSPORT_SUPPORTED, resolve);
        });
    }
}
/* harmony default export */ __webpack_exports__["default"] = (Trebuchet);


/***/ }),

/***/ "./src/WRTCTrebuchet.ts":
/*!******************************!*\
  !*** ./src/WRTCTrebuchet.ts ***!
  \******************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _mattkrick_fast_rtc_peer__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @mattkrick/fast-rtc-peer */ "@mattkrick/fast-rtc-peer");
/* harmony import */ var _mattkrick_fast_rtc_peer__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_mattkrick_fast_rtc_peer__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _Trebuchet__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./Trebuchet */ "./src/Trebuchet.ts");


class WRTCTrebuchet extends _Trebuchet__WEBPACK_IMPORTED_MODULE_1__["default"] {
    constructor(settings) {
        super(settings);
        this.fetchSignalServer = settings.fetchSignalServer;
        this.rtcConfig = settings.rtcConfig || {};
        this.setup();
    }
    responseToKeepAlive() {
        if (!this.timeout || this.timeout > _Trebuchet__WEBPACK_IMPORTED_MODULE_1__["MAX_INT"])
            return;
        this.peer.send(_Trebuchet__WEBPACK_IMPORTED_MODULE_1__["Events"].KEEP_ALIVE);
        clearTimeout(this.keepAliveTimeoutId);
        this.keepAliveTimeoutId = window.setTimeout(this.peer.close.bind(this.peer), this.timeout * 1.5);
    }
    setup() {
        this.peer = new _mattkrick_fast_rtc_peer__WEBPACK_IMPORTED_MODULE_0___default.a(Object.assign({ isOfferer: true }, this.rtcConfig));
        this.peer.on(_mattkrick_fast_rtc_peer__WEBPACK_IMPORTED_MODULE_0__["SIGNAL"], async (signal) => {
            const result = await this.fetchSignalServer(signal);
            if (result) {
                this.peer.dispatch(result);
            }
        });
        this.peer.on(_mattkrick_fast_rtc_peer__WEBPACK_IMPORTED_MODULE_0__["DATA_OPEN"], this.handleOpen.bind(this));
        this.peer.on(_mattkrick_fast_rtc_peer__WEBPACK_IMPORTED_MODULE_0__["ERROR"], () => {
            if (this.canConnect === undefined) {
                this.canConnect = false;
                this.emit(_Trebuchet__WEBPACK_IMPORTED_MODULE_1__["Events"].TRANSPORT_SUPPORTED, false);
            }
        });
        this.peer.on(_mattkrick_fast_rtc_peer__WEBPACK_IMPORTED_MODULE_0__["DATA"], (data) => {
            if (data === _Trebuchet__WEBPACK_IMPORTED_MODULE_1__["Events"].KEEP_ALIVE) {
                this.responseToKeepAlive();
            }
            else {
                this.emit(_Trebuchet__WEBPACK_IMPORTED_MODULE_1__["Events"].DATA, data);
            }
        });
        this.peer.on(_mattkrick_fast_rtc_peer__WEBPACK_IMPORTED_MODULE_0__["DATA_CLOSE"], () => {
            if (!this.canConnect)
                return;
            if (this.reconnectAttempts === 0) {
                this.emit(_Trebuchet__WEBPACK_IMPORTED_MODULE_1__["Events"].TRANSPORT_DISCONNECTED);
            }
            this.tryReconnect();
        });
    }
    send(message) {
        if (this.peer.peerConnection.iceConnectionState === 'connected') {
            this.peer.send(message);
        }
        else {
            this.messageQueue.add(message);
        }
    }
    close(reason) {
        this.canConnect = false;
        this.messageQueue.clear();
        this.peer.close();
        this.emit(_Trebuchet__WEBPACK_IMPORTED_MODULE_1__["Events"].CLOSE, { code: 1000, reason, isClientClose: true });
    }
}
/* harmony default export */ __webpack_exports__["default"] = (WRTCTrebuchet);


/***/ }),

/***/ "./src/getTrebuchet.ts":
/*!*****************************!*\
  !*** ./src/getTrebuchet.ts ***!
  \*****************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
const getTrebuchet = async (thunks) => {
    for (let i = 0; i < thunks.length; i++) {
        const trebuchet = thunks[i]();
        if (await trebuchet.isSupported()) {
            return trebuchet;
        }
    }
    return null;
};
/* harmony default export */ __webpack_exports__["default"] = (getTrebuchet);


/***/ }),

/***/ "./src/index.ts":
/*!**********************!*\
  !*** ./src/index.ts ***!
  \**********************/
/*! exports provided: Trebuchet, SocketTrebuchet, SSETrebuchet, WRTCTrebuchet, default, Events, MAX_INT, TREBUCHET_WS, SSE_ID, SSE_CLOSE_EVENT */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _Trebuchet__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Trebuchet */ "./src/Trebuchet.ts");
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "Trebuchet", function() { return _Trebuchet__WEBPACK_IMPORTED_MODULE_0__["default"]; });

/* harmony import */ var _SocketTrebuchet__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./SocketTrebuchet */ "./src/SocketTrebuchet.ts");
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "SocketTrebuchet", function() { return _SocketTrebuchet__WEBPACK_IMPORTED_MODULE_1__["default"]; });

/* harmony import */ var _SSETrebuchet__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./SSETrebuchet */ "./src/SSETrebuchet.ts");
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "SSETrebuchet", function() { return _SSETrebuchet__WEBPACK_IMPORTED_MODULE_2__["default"]; });

/* harmony import */ var _WRTCTrebuchet__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./WRTCTrebuchet */ "./src/WRTCTrebuchet.ts");
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "WRTCTrebuchet", function() { return _WRTCTrebuchet__WEBPACK_IMPORTED_MODULE_3__["default"]; });

/* harmony import */ var _getTrebuchet__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./getTrebuchet */ "./src/getTrebuchet.ts");
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "default", function() { return _getTrebuchet__WEBPACK_IMPORTED_MODULE_4__["default"]; });

/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "Events", function() { return _Trebuchet__WEBPACK_IMPORTED_MODULE_0__["Events"]; });

/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "MAX_INT", function() { return _Trebuchet__WEBPACK_IMPORTED_MODULE_0__["MAX_INT"]; });

/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "TREBUCHET_WS", function() { return _Trebuchet__WEBPACK_IMPORTED_MODULE_0__["TREBUCHET_WS"]; });

/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "SSE_ID", function() { return _Trebuchet__WEBPACK_IMPORTED_MODULE_0__["SSE_ID"]; });

/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "SSE_CLOSE_EVENT", function() { return _Trebuchet__WEBPACK_IMPORTED_MODULE_0__["SSE_CLOSE_EVENT"]; });









/***/ }),

/***/ "@mattkrick/fast-rtc-peer":
/*!*******************************************!*\
  !*** external "@mattkrick/fast-rtc-peer" ***!
  \*******************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = require("@mattkrick/fast-rtc-peer");

/***/ }),

/***/ "eventemitter3":
/*!********************************!*\
  !*** external "eventemitter3" ***!
  \********************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = require("eventemitter3");

/***/ })

/******/ });
//# sourceMappingURL=index.js.map