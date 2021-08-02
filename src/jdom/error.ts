import { JACDAC_ERROR } from "./constants"

export class JDError extends Error {
    constructor(message: string, readonly jacdacName?: string) {
        super(message)
        this.name = JACDAC_ERROR
    }
}

export default function errorPath(e: JDError): string {
    return (e as JDError)?.jacdacName
}
