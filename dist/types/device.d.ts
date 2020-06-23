/// <reference types="node" />
import { Packet } from "./packet";
import { SMap } from "./utils";
export declare const deviceNames: SMap<string>;
/**
 * Gets the current list of known devices on the bus
 */
export declare function getDevices(): Device[];
/**
 * Gets a device on the bus
 * @param id
 */
export declare function getDevice(id: string): Device;
export declare class Device {
    deviceId: string;
    services: Uint8Array;
    lastSeen: number;
    lastServiceUpdate: number;
    currentReading: Uint8Array;
    private _shortId;
    constructor(deviceId: string);
    get name(): string;
    get shortId(): string;
    toString(): string;
    hasService(service_class: number): boolean;
    serviceAt(idx: number): number;
    sendCtrlCommand(cmd: number, payload?: Buffer): void;
}
export declare function shortDeviceId(devid: string): string;
/**
 * Ingests and process a packet received from the bus.
 * @param pkt a jacdac packet
 */
export declare function processPacket(pkt: Packet): void;
