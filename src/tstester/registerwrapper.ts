import { JDRegister, jdunpack, PackedValues, Packet, REPORT_RECEIVE } from "../jdom/jacdac-jdom"
import { TesterEvent } from "./base"
import { TestingNamer } from "./naming"


// An error that fires if the register is not within bounds before the trigger
class RegisterPreConditionError extends Error {
}

// TODO support non-[number] registers?
export interface RegisterUpdateOptions {
    preRequiredRange?: [number, number]  // if defineds, requires all values before the trigger are within this range and not undefined
    triggerRange?: [number, number]  // acceptable range of trigger conditions, otherwise triggers on any sample
}

// Helper methods forr register evnets
abstract class RegisterEvent extends TesterEvent {
    readonly packFormat: string

    constructor(protected readonly register: RegisterTester) {
        super()
        this.packFormat = register.register.specification.packFormat
    }

    // Hacky wrapper around a PackedValues [number] that extracts the single value
    protected maybeGetValue(raw: PackedValues): number | undefined {
        if (raw === undefined) {
            return undefined
        } else {
            return (raw as [number])[0]
        }
    }
}

// Event that fires on a matching register change from the specified service
class RegisterUpdateEvent extends RegisterEvent {
    constructor(protected readonly register: RegisterTester, protected options: RegisterUpdateOptions) {
        super(register)
    }
    
    public makePromise() {
        const triggerPromise = new Promise((resolve, reject) => {
            const handler = (packet: Packet) => {
                const thisValue = this.maybeGetValue(jdunpack(packet.data, this.packFormat))

                // check if the sample is valid for preRequiredRange
                const precondition = this.options.preRequiredRange === undefined || (
                    thisValue !== undefined &&
                    thisValue >= this.options.preRequiredRange[0] && thisValue <= this.options.preRequiredRange[1]
                )
                // whether or not toRange is defined, the current sample must be valid
                const triggered = thisValue !== undefined && (
                    (this.options.triggerRange === undefined ||
                        (thisValue >= this.options.triggerRange[0] && thisValue <= this.options.triggerRange[1])))

                if (triggered) {  // ignore precondition on trigger
                    this.register.register.off(REPORT_RECEIVE, handler)
                    resolve(undefined)
                } else if (!precondition) {  // otherwise assert precondition
                    this.register.register.off(REPORT_RECEIVE, handler)
                    reject(new RegisterPreConditionError(`register value ${this.register.name} = ${thisValue} not in precondition ${this.options.preRequiredRange}`))
                }
            }
            this.register.register.on(REPORT_RECEIVE, handler)
        })

        return {triggerPromise}
    }
}

class RegisterHold extends RegisterEvent {
    constructor(protected readonly register: RegisterTester, protected range: [number, number]) {
        super(register)
    }   

    public makePromise() {
        let terminateHold: () => void

        const holdingPromise = new Promise((resolve, reject) => {
            const handler = (packet: Packet) => {
                const thisValue = this.maybeGetValue(jdunpack(packet.data, this.packFormat))

                if (thisValue === undefined || thisValue <= this.range[0] || thisValue >= this.range[1]) {
                    this.register.register.off(REPORT_RECEIVE, handler)
                    reject(new RegisterPreConditionError(`register value ${this.register.name} = ${thisValue} not in precondition ${this.range}`))
                }
            }

            terminateHold = () => {
                this.register.register.off(REPORT_RECEIVE, handler)
            }

            this.register.register.on(REPORT_RECEIVE, handler)
        })

        return {holdingListener: {holdingPromise, terminateHold}}
    }
}

export class RegisterTester {
    constructor(readonly register: JDRegister) {

    }

    public get name() {
        return TestingNamer.nameOfRegister(this.register)
    }

    // Event that fires on a register update (even with unchagned value), optionally with a starting (arming) and to (trigger) filter
    public onUpdate(options: RegisterUpdateOptions = {}) {
        return new RegisterUpdateEvent(this, options)
    }

    public hold(range: [number, number]) {
        return new RegisterHold(this, range)
    }
}
