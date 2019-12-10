import Trebuchet, { Data } from './Trebuchet';
export interface WSSettings {
    url: string;
    timeout?: number;
}
declare class SocketTrebuchet extends Trebuchet {
    ws: WebSocket;
    private readonly url;
    private lastKeepAlive;
    private isClientClose?;
    constructor(settings: WSSettings);
    private keepAlive;
    protected setup(): void;
    send: (message: Data) => void;
    close(reason?: string): void;
}
export default SocketTrebuchet;
//# sourceMappingURL=SocketTrebuchet.d.ts.map