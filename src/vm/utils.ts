export const VM_ERROR = "vmError"
export const VM_WATCH_CHANGE = "vmWatchChange"
export const VM_MISSING_ROLE_WARNING = "vmMissingRole"
export const VM_MISSING_DEVICE_WARNING = "vmMissingDevice"
export const VM_BREAKPOINT = "vmBreakpoint"
export const VM_COMMAND_ATTEMPTED = "vmCommandAttempted"
export const VM_COMMAND_COMPLETED = "vmCommandCompleted"

export class JDVMError extends Error {
    constructor(message: string, readonly jacdacName?: string) {
        super(message)
        this.name = VM_ERROR
    }
}

export default function errorPath(e: JDVMError): string {
    return (e as JDVMError)?.jacdacName
}