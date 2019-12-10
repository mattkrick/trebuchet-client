import EventEmitter from 'eventemitter3';
import MessageQueue from './MessageQueue';
import StrictEventEmitter from 'strict-event-emitter-types';
export interface TrebuchetSettings {
    timeout?: number;
}
export declare enum Events {
    KEEP_ALIVE = "ka",
    DATA = "data",
    CLOSE = "close",
    TRANSPORT_SUPPORTED = "supported",
    TRANSPORT_CONNECTED = "connected",
    TRANSPORT_RECONNECTED = "reconnected",
    TRANSPORT_DISCONNECTED = "disconnected"
}
interface ClosePayload {
    code?: number;
    reason?: string;
    isClientClose: boolean;
}
interface TrebuchetEvents {
    [Events.CLOSE]: ClosePayload;
    [Events.DATA]: Data | object;
    [Events.KEEP_ALIVE]: void;
    [Events.TRANSPORT_CONNECTED]: void;
    [Events.TRANSPORT_RECONNECTED]: void;
    [Events.TRANSPORT_DISCONNECTED]: void;
    [Events.TRANSPORT_SUPPORTED]: boolean;
}
export declare const MAX_INT: number;
export declare const TREBUCHET_WS = "trebuchet-ws";
export declare const SSE_ID = "id";
export declare const SSE_CLOSE_EVENT = "close";
export declare type Data = string | ArrayBufferLike | Blob | ArrayBufferView;
export declare type TrebuchetEmitter = {
    new (): StrictEventEmitter<EventEmitter, TrebuchetEvents>;
};
declare const Trebuchet_base: TrebuchetEmitter;
declare abstract class Trebuchet extends Trebuchet_base {
    protected readonly backoff: Array<number>;
    protected readonly timeout: number;
    protected messageQueue: MessageQueue;
    protected canConnect: boolean | undefined;
    protected reconnectAttempts: number;
    protected reconnectTimeoutId: number | undefined;
    protected keepAliveTimeoutId: number | undefined;
    constructor(settings: TrebuchetSettings);
    abstract close(reason?: string): void;
    abstract send(message: Data): void;
    protected abstract setup(): void;
    protected handleOpen: () => void;
    protected tryReconnect(): void;
    isSupported(): Promise<boolean>;
}
export default Trebuchet;
//# sourceMappingURL=Trebuchet.d.ts.map