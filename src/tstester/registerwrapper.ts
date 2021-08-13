import {
    assert,
    EventHandler,
    JDRegister,
    PackedValues,
    REPORT_RECEIVE,
} from "../jdom/jacdac-jdom"
import { TestErrorBase } from "./base"
import { EventWithHoldAdapter } from "./eventhold"
import { TestingNamer } from "./naming"

// An error that fires if the register is not within bounds before the trigger
export class RegisterConditionError extends TestErrorBase {}

// TODO support non-[number] registers?
export interface RegisterValueOptions {
    precondition?: number | [number, number] // if defineds, requires all values before the trigger are within this range and not undefined
}

// Base service for register events that provides utilities as well as handles bus on/off
abstract class BaseRegisterEvent extends EventWithHoldAdapter<JDRegister> {
    readonly packFormat: string

    constructor(protected readonly busRegister: RegisterTester) {
        // TODO dedup name w/ EventHoldAdapter.register()
        super()
        this.packFormat = busRegister.register.specification.packFormat
    }

    protected register(handler: (data: JDRegister) => void) {
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

    // Checks if a value is within a condition specified as either an exact matching number of valid interval
    protected valueWithinCondition(value: number, requirement: number | [number, number]) {
        if (typeof requirement == 'number') {  // is a single number, check exact match
            return value == (requirement as number)
        } else if (Array.isArray(requirement)) {  // is array, interpret as range
            const low = requirement[0] as number, high = requirement[1] as number
            assert(low <= high, `lower end of requirement range ${low} must be <= higher end of requirement range ${high}`)
            return value >= low && value <= high
        }
    }
}

// Event that fires on a matching register change from the specified service
class BaseRegisterUpdateEvent extends BaseRegisterEvent {
    constructor(
        protected readonly busRegister: RegisterTester,
        protected trigger: number | [number, number],
        protected options: RegisterValueOptions
    ) {
        super(busRegister)
    }

    protected processTrigger(register: JDRegister) {
        const thisValue = this.maybeGetValue(register.unpackedValue)

        // check if the sample is valid for preRequiredRange
        const precondition =
            this.options.precondition === undefined ||
            (thisValue !== undefined && this.valueWithinCondition(thisValue, this.options.precondition))

        // whether or not toRange is defined, the current sample must be valid
        const triggered =
            thisValue !== undefined && this.valueWithinCondition(thisValue, this.trigger)
            

        if (triggered) {
            // ignore precondition on trigger
            return true
        } else if (!precondition) {
            // otherwise assert precondition
            throw new RegisterConditionError(
                `register value ${this.register.name} = ${thisValue} not in precondition ${this.options.precondition}`
            )
        } else {
            return false
        }
    }
}

class RegisterUpdateEvent extends BaseRegisterUpdateEvent {
    public hold() {
        return new RegisterUpdateEventHold(this.busRegister, this.trigger, this.options)
    }
}

class RegisterUpdateEventHold extends BaseRegisterUpdateEvent {
    constructor(
        protected readonly busRegister: RegisterTester,
        protected trigger: number | [number, number],
        protected options: RegisterValueOptions
    ) {
        super(busRegister, trigger, options)
    }

    protected processHold(register: JDRegister) {
        const thisValue = this.maybeGetValue(register.unpackedValue)

        const hold = thisValue !== undefined && this.valueWithinCondition(thisValue, this.trigger)

        if (!hold) {
            throw new RegisterConditionError(
                `register value ${this.register.name} = ${thisValue} not in hold condition ${this.trigger}`
            )
        }
    }
}

class RegisterHold extends BaseRegisterEvent {
    constructor(
        protected readonly busRegister: RegisterTester,
        protected value: number | [number, number]
    ) {
        super(busRegister)
    }

    protected processHold(register: JDRegister) {
        const thisValue = this.maybeGetValue(register.unpackedValue)

        const valid = thisValue !== undefined && this.valueWithinCondition(thisValue, this.value)

        if (!valid) {
            throw new RegisterConditionError(
                `register value ${this.register.name} = ${thisValue} not in precondition ${this.value}`
            )
        }
    }
}

export class RegisterTester {
    constructor(readonly register: JDRegister) {}

    public get name() {
        return TestingNamer.nameOfRegister(this.register)
    }

    // Event that fires on a register update (even with unchagned value), optionally with a starting (arming) and to (trigger) filter
    public onValue(trigger: number | [number, number],
        options: RegisterValueOptions = {}) {
        return new RegisterUpdateEvent(this, trigger, options)
    }

    public hold(value: number | [number, number]) {
        return new RegisterHold(this, value)
    }
}
