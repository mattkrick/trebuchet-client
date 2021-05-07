import Trebuchet from './Trebuchet';
declare const getTrebuchet: (thunks: Array<() => Trebuchet>) => Promise<Trebuchet | null>;
export default getTrebuchet;
