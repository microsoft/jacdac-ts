import * as jd from "./jd";
export interface Options {
    skipRepeatedAnnounce?: boolean;
    skipRepeatedReading?: boolean;
}
export declare function printPkt(pkt: jd.Packet, opts?: Options): string;
export interface ParsedFrame {
    timestamp: number;
    data: Uint8Array;
    info?: string;
}
export declare function parseLog(logcontents: string): ParsedFrame[];
