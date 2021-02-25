import EventEmitter from 'eventemitter3';
import StrictEventEmitter from 'strict-event-emitter-types';
import MessageQueue from './MessageQueue';
export interface TrebuchetSettings {
    timeout?: number;
    batchDelay?: number;
}
interface ClosePayload {
    code?: number;
    reason?: string;
}
interface TrebuchetEvents {
    close: ClosePayload;
    data: object | string | boolean | number;
    connected: void;
    reconnected: void;
    disconnected: void;
    supported: boolean;
}
export declare type Data = string | ArrayBufferLike;
export declare type TrebuchetEmitter = {
    new (): StrictEventEmitter<EventEmitter, TrebuchetEvents>;
};
declare const Trebuchet_base: TrebuchetEmitter;
declare abstract class Trebuchet extends Trebuchet_base {
    protected readonly backoff: Array<number>;
    protected readonly timeout: number;
    protected readonly batchDelay: number;
    protected messageQueue: MessageQueue;
    protected canConnect: boolean | undefined;
    protected reconnectAttempts: number;
    protected reconnectTimeoutId: number | undefined;
    protected keepAliveTimeoutId: number | undefined;
    protected lastMid: number;
    protected robustQueue: {
        [mid: number]: any;
    };
    protected midsToIgnore: number[];
    protected requestedMids: number[];
    constructor(settings: TrebuchetSettings);
    abstract close(reason?: string): void;
    abstract send(message: any): void;
    protected abstract setup(): void;
    protected handleOpen: () => void;
    protected tryReconnect(): void;
    isSupported(): Promise<boolean>;
}
export default Trebuchet;
//# sourceMappingURL=Trebuchet.d.ts.map