
export const VM_EVENT = "vmEvent"

export enum VMCode {
    WatchChange = "vmWatchChange",
    Breakpoint = "vmBreakpoint",
    CommandStarted = "vmCommandStarted",
    CommandCompleted = "vmCommandCompleted",
    CommandFailed = "vmCommandFailed",
    RoleMissing = "vmRoleMissing",
    VariableValueChange = "vmVariableChanged",
    DynamicTypeError = "vmDynamicTypeError", 
    InternalError = "vmInternalError",
}
