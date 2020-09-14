import { LogLevel } from "../dom/domservices";

export interface IMessage {
    id?: string;
    source: 'jacdac' | 'host',
    type: string;
    data: any;
    requireAck?: boolean;
}
export interface IAckMessage extends IMessage {
    type: 'ack';
    ackId?: string;
    data: {
        status: "success" | "error";
        data?: any;
        error?: any;
    }
}

export interface ILogMessage extends IMessage {
    type: 'log',
    data: {
        level?: LogLevel,
        message: any
    }
}

export type Status = 'unknown' | 'ready'

export interface IStatusMessage extends IMessage {
    type: 'status',
    data: {
        status: Status,
    }
}
export interface ISaveTextMessage extends IMessage {
    type: 'save-text';
    data: {
        name: string;
        data: string;
    }
}
