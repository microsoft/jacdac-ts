/** Jacdac IFrame Message protocol */
export interface IMessage {
    id?: string
    source: "jacdac"
    type: string
    data: any
    requireAck?: boolean
}
export interface IAckMessage extends IMessage {
    type: "ack"
    ackId?: string
    data: {
        status: "success" | "error"
        data?: any
        error?: any
    }
}
export type LogLevel = "error" | "warn" | "log" | "info" | "debug"
export interface ILogMessage extends IMessage {
    type: "log"
    data: {
        level?: LogLevel
        message: any
    }
}
export interface IThemeMessage extends IMessage {
    type: "theme"
    data: {
        type: "light" | "dark"
    }
}
export type Status = "unknown" | "ready"
export interface IStatusMessage extends IMessage {
    type: "status"
    data: {
        status: Status
    }
}
export interface ISaveTextMessage extends IMessage {
    type: "save-text"
    data: {
        name: string
        data: string
    }
}
export interface IFile {
    name: string
    path: string
    size: number
    mimetype: string
}

export interface IFileContent {
    content: string
    mimetype: string
}

export interface IModelListMessage extends IMessage {
    type: "model-list"
    data: {
        models: IFile[]
        inputConfigurations: IFile[]
    }
}
export interface IFileLoadMessage extends IMessage {
    type: "file-load"
    requireAck: true
    data: {
        path: string
    }
}
/** End Jacdac protocol */
