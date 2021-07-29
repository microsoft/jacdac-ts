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

// Event that fires on a matching register change from the specified service
class RegisterUpdateEvent extends TesterEvent {
    constructor(protected readonly register: RegisterTester, protected options: RegisterUpdateOptions) {
        super()
    }
    
    // Hacky wrapper around a PackedValues [number] that extracts the single value
    protected maybeGetValue(raw: PackedValues): number | undefined {
        if (raw === undefined) {
            return undefined
        } else {
            return (raw as [number])[0]
        }
    }

    public makePromise() {
        const packFormat = this.register.register.specification.packFormat

        const triggerPromise = new Promise((resolve, reject) => {
            const handler = (packet: Packet) => {
                const thisValue = this.maybeGetValue(jdunpack(packet.data, packFormat))

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
                    reject(new RegisterPreConditionError(`register value ${thisValue} not in precondition ${this.options.preRequiredRange}`))
                }
            }
            this.register.register.on(REPORT_RECEIVE, handler)
        })

        return {triggerPromise}
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

    public condition() {
        throw new Error("not implemented")
    }
}
