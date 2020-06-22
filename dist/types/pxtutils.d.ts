export declare function delay<T>(millis: number, value?: T): Promise<T>;
export declare function memcpy(trg: Uint8Array, trgOff: number, src: ArrayLike<number>, srcOff?: number, len?: number): void;
export declare function bufferEq(a: Uint8Array, b: ArrayLike<number>): boolean;
export declare function stringToUint8Array(input: string): Uint8Array;
export declare function uint8ArrayToString(input: ArrayLike<number>): string;
export declare function fromUTF8(binstr: string): string;
export declare function toUTF8(str: string, cesu8?: boolean): string;
export interface SMap<T> {
    [index: string]: T;
}
export declare class PromiseBuffer<T> {
    private waiting;
    private available;
    drain(): void;
    pushError(v: Error): void;
    push(v: T): void;
    shiftAsync(timeout?: number): Promise<T>;
}
export declare class PromiseQueue {
    promises: SMap<(() => Promise<any>)[]>;
    enqueue<T>(id: string, f: () => Promise<T>): Promise<T>;
}
export declare function toHex(bytes: ArrayLike<number>): string;
export declare function fromHex(hex: string): Uint8Array;
export interface MutableArrayLike<T> {
    readonly length: number;
    [n: number]: T;
}
export declare function write32(buf: MutableArrayLike<number>, pos: number, v: number): void;
export declare function write16(buf: MutableArrayLike<number>, pos: number, v: number): void;
export declare function read32(buf: ArrayLike<number>, pos: number): number;
export declare function read16(buf: ArrayLike<number>, pos: number): number;
export declare function encodeU32LE(words: number[]): Uint8Array;
export declare function decodeU32LE(buf: Uint8Array): number[];
export declare const enum NumberFormat {
    Int8LE = 1,
    UInt8LE = 2,
    Int16LE = 3,
    UInt16LE = 4,
    Int32LE = 5,
    Int8BE = 6,
    UInt8BE = 7,
    Int16BE = 8,
    UInt16BE = 9,
    Int32BE = 10,
    UInt32LE = 11,
    UInt32BE = 12,
    Float32LE = 13,
    Float64LE = 14,
    Float32BE = 15,
    Float64BE = 16
}
export declare function getNumber(buf: ArrayLike<number>, fmt: NumberFormat, offset: number): number;
export declare function bufferToString(buf: Uint8Array): string;
export declare function bufferConcat(a: Uint8Array, b: Uint8Array): Uint8Array;
export declare function jsonCopyFrom<T>(trg: T, src: T): void;
export declare function assert(cond: boolean, msg?: string): void;
export declare function flatClone<T extends Object>(obj: T): T;
export declare function clone<T>(v: T): T;
