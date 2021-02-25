import Trebuchet, { Data, TrebuchetSettings } from './Trebuchet';
export declare type FetchData = (data: any, connectionId: string) => Promise<Data>;
export declare type FetchPing = (connectionId: string) => Promise<Response>;
export declare type FetchReliable = (connectionId: string, data: ArrayBuffer) => Promise<Response>;
export interface SSESettings extends TrebuchetSettings {
    getUrl: () => string;
    fetchData: FetchData;
    fetchPing: FetchPing;
    fetchReliable?: FetchReliable;
}
declare class SSETrebuchet extends Trebuchet {
    source: EventSource;
    private readonly getUrl;
    private readonly fetchData;
    private readonly fetchPing;
    private readonly fetchReliable?;
    private connectionId;
    constructor(settings: SSESettings);
    private sendAck;
    private sendReq;
    private releaseNextRobustMessage;
    protected setup: () => void;
    private handleFetch;
    send: (message: Data) => void;
    reply: (data: ArrayBufferLike) => void;
    close(reason?: string): void;
}
export default SSETrebuchet;
//# sourceMappingURL=SSETrebuchet.d.ts.map