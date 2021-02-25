import Trebuchet, { Data, TrebuchetSettings } from './Trebuchet';
declare type Encode = (msg: any) => Data;
declare type Decode = (msg: any) => {
    message: any;
    mid?: number;
};
export interface WSSettings extends TrebuchetSettings {
    getUrl: () => string;
    encode?: Encode;
    decode?: Decode;
}
export declare const TREBUCHET_WS = "trebuchet-ws";
declare class SocketTrebuchet extends Trebuchet {
    ws: WebSocket;
    private readonly getUrl;
    private encode;
    private decode;
    private mqTimer;
    constructor(settings: WSSettings);
    private keepAlive;
    private sendAck;
    private sendReq;
    private releaseNextRobustMessage;
    protected setup(): void;
    send: (message: any) => void;
    close(reason?: string): void;
}
export default SocketTrebuchet;
//# sourceMappingURL=SocketTrebuchet.d.ts.map