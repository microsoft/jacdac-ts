export interface JDDOMServices {
    logger?: ILogger
}

export type LogLevel = 'error' | 'warning' | 'log' | 'info' | 'debug'

export interface ILogger {
    log(level: LogLevel, message: any, optionalArgs?: any[]): void;
}

export class ConsoleLogger implements ILogger {
    log(level: LogLevel, message: any, optionalArgs?: any[]): void {
        switch (level) {
            case 'error': console.error(message, optionalArgs);
            case 'warning': console.warn(message, optionalArgs);
            case 'info': console.info(message, optionalArgs);
            case 'debug': console.debug(message, optionalArgs);
            default: console.log(message, optionalArgs)
        }
    }
}