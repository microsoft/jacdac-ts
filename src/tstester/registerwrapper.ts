import { assert, EventHandler, JDRegister, jdunpack, PackedValues, Packet, REPORT_RECEIVE } from "../jdom/jacdac-jdom"
import { EventWithHoldAdapter } from "./eventhold"
import { TestingNamer } from "./naming"


// An error that fires if the register is not within bounds before the trigger
class RegisterPreConditionError extends Error {
}

// TODO support non-[number] registers?
export interface RegisterUpdateOptions {
    preRequiredRange?: [number, number]  // if defineds, requires all values before the trigger are within this range and not undefined
    triggerRange?: [number, number]  // acceptable range of trigger conditions, otherwise triggers on any sample
}

// Base service for register events that provides utilities as well as handles bus on/off
abstract class BaseRegisterEvent extends EventWithHoldAdapter<Packet> {
    readonly packFormat: string

    constructor(protected readonly busRegister: RegisterTester) {  // TODO dedup name w/ EventHoldAdapter.register()
        super()
        this.packFormat = busRegister.register.specification.packFormat
    }

    protected register(handler: (data: Packet) => void) {
        return this.busRegister.register.on(REPORT_RECEIVE, handler)
    }

    protected deregister(handle: unknown) {
        this.busRegister.register.off(REPORT_RECEIVE, handle as EventHandler)
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
class BaseRegisterUpdateEvent extends BaseRegisterEvent {
    constructor(protected readonly busRegister: RegisterTester, protected options: RegisterUpdateOptions) {
        super(busRegister)
    }
    
    protected processTrigger(packet: Packet) {
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
            return true
        } else if (!precondition) {  // otherwise assert precondition
            throw new RegisterPreConditionError(`register value ${this.register.name} = ${thisValue} not in precondition ${this.options.preRequiredRange}`)
        } else {
            return false
        }
    }
}

class RegisterUpdateEvent extends BaseRegisterUpdateEvent {
    public hold() {
        return new RegisterUpdateEventHold(this.busRegister, this.options)
    }
}

class RegisterUpdateEventHold extends BaseRegisterUpdateEvent {
    constructor(protected readonly busRegister: RegisterTester, protected options: RegisterUpdateOptions) {
        super(busRegister, options)
        assert(options.triggerRange !== undefined, "may not have undefined trigger range with .hold()")
    }
    
    protected processHold(packet: Packet) {
        const thisValue = this.maybeGetValue(jdunpack(packet.data, this.packFormat))

        if (thisValue === undefined || thisValue <= this.options.triggerRange[0] || thisValue >= this.options.triggerRange[1]) {
            throw new RegisterPreConditionError(`register value ${this.register.name} = ${thisValue} not in hold condition ${this.options.triggerRange}`)
        }
    }
}

class RegisterHold extends BaseRegisterEvent {
    constructor(protected readonly busRegister: RegisterTester, protected range: [number, number]) {
        super(busRegister)
    }   

    protected processHold(packet: Packet) {
        const thisValue = this.maybeGetValue(jdunpack(packet.data, this.packFormat))

        if (thisValue === undefined || thisValue <= this.range[0] || thisValue >= this.range[1]) {
            throw new RegisterPreConditionError(`register value ${this.register.name} = ${thisValue} not in precondition ${this.range}`)
        }
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
