import { VMProgram } from "./vmir";

export default interface VMFile {
    xml: string
    name?: string
    program?: VMProgram
}
