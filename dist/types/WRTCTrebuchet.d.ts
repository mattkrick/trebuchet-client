import FastRTCPeer, { DispatchPayload } from '@mattkrick/fast-rtc-peer';
import Trebuchet, { Data } from './Trebuchet';
export declare type FetchSignalServer = (signal: DispatchPayload) => Promise<DispatchPayload | null>;
export interface WRTCSettings {
    fetchSignalServer: FetchSignalServer;
    rtcConfig: RTCConfiguration;
    timeout?: number;
}
declare class WRTCTrebuchet extends Trebuchet {
    peer: FastRTCPeer;
    private readonly rtcConfig;
    private readonly fetchSignalServer;
    constructor(settings: WRTCSettings);
    private responseToKeepAlive;
    protected setup(): void;
    send(message: Data): void;
    close(reason?: string): void;
}
export default WRTCTrebuchet;
//# sourceMappingURL=WRTCTrebuchet.d.ts.map