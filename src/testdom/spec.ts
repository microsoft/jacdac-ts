export enum TestState {
    Pass,
    Indeterminate,
    Running,
    Fail,
}

export interface TestResult {
    state: TestState
    output?: string
}

export interface PanelTestSpec {
    id?: string
    devices: DeviceTestSpec[]
    oracles?: OracleTestSpec[]
}

export interface OracleTestSpec {
    serviceClass: number
    deviceId: string
    serviceIndex?: number
    tolerance?: number
}

export interface DeviceTestSpec {
    productIdentifier: number
    count: number
    firmwareVersion?: string
    services: ServiceTestSpec[]
}

export interface ServiceTestSpec {
    name?: string
    serviceClass: number
    count?: number
    rules?: ServiceTestRule[]
    disableBuiltinRules?: boolean
}

export interface ManualSteps {
    prepare?: string
    validate?: string
}

export interface ServiceTestRule {
    type:
        | "reading"
        | "intensity"
        | "value"
        | "oracleReading"
        | "event"
        | "setIntensityAndValue"
    name?: string
    manualSteps?: ManualSteps
}
export interface ReadingTestRule extends ServiceTestRule {
    type: "reading" | "intensity" | "value"
    value: number
    tolerance?: number
    samples?: number
}
export interface SetIntensityAndValueTestRule extends ServiceTestRule {
    type: "setIntensityAndValue"
    steps: {
        duration: number
        intensity?: number
        value?: number
    }[]
}
export interface OracleReadingTestRule extends ServiceTestRule {
    type: "oracleReading"
    oracle: OracleTestSpec
    tolerance?: number
}
export interface EventTestRule extends ServiceTestRule {
    type: "event"
    eventName: string
}
