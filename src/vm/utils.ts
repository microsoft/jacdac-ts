export const VM_ERROR = "JacdacVMError"

export const ROLE_BOUND = "roleBound"
export const ROLE_UNBOUND = "roleUnbound"
export const ROLE_HAS_NO_SERVICE = "roleHasNoService"
export const VM_COMMAND_ATTEMPTED = "commandAttempted"
export const VM_COMMAND_COMPLETED = "commandCompleted"

export class JDVMError extends Error {
    constructor(message: string, readonly jacdacName?: string) {
        super(message)
        this.name = VM_ERROR
    }
}

export default function errorPath(e: JDVMError): string {
    return (e as JDVMError)?.jacdacName
}