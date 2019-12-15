import Trebuchet, { Data, TrebuchetSettings } from './Trebuchet';
export declare type FetchData = (data: any, connectionId: string) => Promise<Data>;
export declare type FetchPing = (connectionId: string) => Promise<Response>;
export interface SSESettings extends TrebuchetSettings {
    url: string;
    fetchData: FetchData;
    fetchPing: FetchPing;
}
declare class SSETrebuchet extends Trebuchet {
    source: EventSource;
    private readonly url;
    private readonly fetchData;
    private readonly fetchPing;
    private connectionId;
    constructor(settings: SSESettings);
    protected setup: () => void;
    private handleFetch;
    send: (message: Data) => void;
    close(reason?: string): void;
}
export default SSETrebuchet;
//# sourceMappingURL=SSETrebuchet.d.ts.map