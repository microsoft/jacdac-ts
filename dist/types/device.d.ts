/// <reference types="node" />
import { Packet } from "./packet";
/**
 * A JACDAC bus manager. This instance maintains the list of devices on the bus.
 */
export declare class Bus {
    sendPacket: (p: Packet) => Promise<void>;
    private devices_;
    private deviceNames;
    /**
     * Creates the bus with the given transport
     * @param sendPacket
     */
    constructor(sendPacket: (p: Packet) => Promise<void>);
    /**
     * Gets the current list of known devices on the bus
     */
    getDevices(): Device[];
    /**
     * Gets a device on the bus
     * @param id
     */
    getDevice(id: string): Device;
    /**
     * Ingests and process a packet received from the bus.
     * @param pkt a jacdac packet
     */
    processPacket(pkt: Packet): void;
    /**
     * Tries to find the given device by id
     * @param id
     */
    lookupName(id: string): string;
}
export declare class Device {
    bus: Bus;
    deviceId: string;
    services: Uint8Array;
    lastSeen: number;
    lastServiceUpdate: number;
    currentReading: Uint8Array;
    private _shortId;
    constructor(bus: Bus, deviceId: string);
    get name(): string;
    get shortId(): string;
    toString(): string;
    hasService(service_class: number): boolean;
    serviceAt(idx: number): number;
    sendCtrlCommand(cmd: number, payload?: Buffer): void;
}
export declare function shortDeviceId(devid: string): string;
