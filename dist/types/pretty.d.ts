import { Packet } from "./packet";
export interface Options {
    skipRepeatedAnnounce?: boolean;
    skipRepeatedReading?: boolean;
}
export declare function printPacket(pkt: Packet, opts?: Options): string;
export interface ParsedFrame {
    timestamp: number;
    data: Uint8Array;
    info?: string;
}
export declare function parseLog(logcontents: string): ParsedFrame[];
