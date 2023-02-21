/** Jacdac IFrame Message protocol */
export interface EmbedMessage {
    id?: string
    source: "jacdac"
    type: string
    data: any
    requireAck?: boolean
}
export interface EmbedAckMessage extends EmbedMessage {
    type: "ack"
    ackId?: string
    data: {
        status: "success" | "error"
        data?: any
        error?: any
    }
}
export type EmbedLogLevel = "error" | "warn" | "log" | "info" | "debug"
export interface EmbedLogMessage extends EmbedMessage {
    type: "log"
    data: {
        level?: EmbedLogLevel
        message: any
    }
}
export interface EmbedThemeMessage extends EmbedMessage {
    type: "theme"
    data: {
        type: "light" | "dark"
    }
}
export interface EmbedSpecsMessage extends EmbedMessage {
    type: "specs"
    data: {
        services?: jdspec.ServiceSpec[]
    }
}
export type EmbedStatus = "unknown" | "ready"
export interface EmbedStatusMessage extends EmbedMessage {
    type: "status"
    data: {
        status: EmbedStatus
    }
}
export interface EmbedSaveTextMessage extends EmbedMessage {
    type: "save-text"
    data: {
        name: string
        data: string
    }
}
export interface EmbedFile {
    name: string
    path: string
    size: number
    mimetype: string
}

export interface EmbedFileContent {
    content: string
    mimetype: string
}

export interface EmbedModelListMessage extends EmbedMessage {
    type: "model-list"
    data: {
        models: EmbedFile[]
        inputConfigurations: EmbedFile[]
    }
}
export interface EmbedFileLoadMessage extends EmbedMessage {
    type: "file-load"
    requireAck: true
    data: {
        path: string
    }
}
/** End Jacdac protocol */
