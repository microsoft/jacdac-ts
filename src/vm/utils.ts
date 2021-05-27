export const JACDAC_VM_ERROR = "JacdacVMError"

export class JDVMError extends Error {
    constructor(message: string, readonly jacdacName?: string) {
        super(message)
        this.name = JACDAC_VM_ERROR
    }
}

export default function errorPath(e: JDVMError): string {
    return (e as JDVMError)?.jacdacName
}