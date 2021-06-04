import { VMProgram } from "./VMir";

export default interface VMFile {
    xml: string
    name?: string
    program?: VMProgram
}
