export const JACDAC_VM_ERROR = "JacdacVMError"
export const JACDAC_ROLE_SERVICE_BOUND = "JacdacVMRoleServiceBound"
export const JACDAC_ROLE_SERVICE_UNBOUND = "JacdacVMRoleServiceUnbound"
export const JACDAC_ROLE_HAS_NO_SERVICE = "JacdacVMRoleHasNoService"

export class JDVMError extends Error {
    constructor(message: string, readonly jacdacName?: string) {
        super(message)
        this.name = JACDAC_VM_ERROR
    }
}

export default function errorPath(e: JDVMError): string {
    return (e as JDVMError)?.jacdacName
}