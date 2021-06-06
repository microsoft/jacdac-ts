import { VMProgram } from "./ir";

export default interface VMFile {
    xml: string
    name?: string
    program?: VMProgram
}
