import EventEmitter from 'eventemitter3';
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
    close: (payload: ClosePayload) => void;
    data: (data: Record<string, unknown> | string | boolean | number | ArrayBufferLike) => void;
    connected: () => void;
    reconnected: () => void;
    disconnected: () => void;
    supported: (isSupported: boolean) => void;
}
export type Data = string | ArrayBufferLike;
export type TrebuchetEmitter = EventEmitter<TrebuchetEvents>;
declare abstract class Trebuchet extends EventEmitter<TrebuchetEvents> {
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
