import { VMProgram } from "./ir"

export interface VMFile {
    xml: string
    name?: string
    program?: VMProgram
}
