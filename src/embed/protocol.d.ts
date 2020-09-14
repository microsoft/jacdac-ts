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

export type Status = 'unknown' | 'ready'

export interface ILogMessage extends IMessage {
    type: 'log',
    data: {
        level: 'error' | 'warning' | 'info' | 'debug',
        message: any
    }
}

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
