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
    oracles?: OrableTestSpec[]
}

export interface OrableTestSpec {
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

export interface ServiceTestRule {
    type: "reading" | "oracleReading" | "event"
}
export interface ReadingTestRule extends ServiceTestRule {
    type: "reading"
    value: number
    tolerance?: number
}
export interface OracleReadingTestRule extends ServiceTestRule {
    type: "oracleReading"
    oracle: OrableTestSpec
    tolerance?: number
}
export interface EventTestRule extends ServiceTestRule {
    type: "event"
    name: string
}
