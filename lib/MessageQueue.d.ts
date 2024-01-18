import { Data } from './Trebuchet';
export type SendFn = (message: Data) => void;
declare class MessageQueue {
    queue: Array<Data>;
    add(message: Data): void;
    clear(): void;
    flush(send: SendFn): void;
}
export default MessageQueue;
