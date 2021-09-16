import {
    CHANGE,
    SRV_VERIFIED_TELEMETRY,
    VerifiedTelemetryCmd,
    VerifiedTelemetryEvent,
    VerifiedTelemetryFingerprintType,
    VerifiedTelemetryReg,
    VerifiedTelemetryStatus,
} from "../jdom/constants"
import JDRegisterServer from "../jdom/servers/registerserver"
import JDServiceServer, { JDServerOptions } from "../jdom/servers/serviceserver"

export default class VerifiedTelemetryServer extends JDServiceServer {
    readonly telemetryStatus: JDRegisterServer<[VerifiedTelemetryStatus]>
    readonly telemetryStatusInterval: JDRegisterServer<[number]>
    readonly fingerprintType: JDRegisterServer<
        [VerifiedTelemetryFingerprintType]
    >
    readonly fingerprintTemplate: JDRegisterServer<[number, Uint8Array]>

    constructor(
        options?: {
            fingerprintType?: VerifiedTelemetryFingerprintType
            telemetryStatusInterval?: number
        } & JDServerOptions
    ) {
        super(SRV_VERIFIED_TELEMETRY, options)

        const {
            fingerprintType = VerifiedTelemetryFingerprintType.FallCurve,
            telemetryStatusInterval = 5000,
        } = options || {}

        this.telemetryStatus = this.addRegister(
            VerifiedTelemetryReg.TelemetryStatus,
            [VerifiedTelemetryStatus.Working]
        )
        this.telemetryStatusInterval = this.addRegister(
            VerifiedTelemetryReg.TelemetryStatusInterval,
            [telemetryStatusInterval]
        )
        this.fingerprintType = this.addRegister<
            [VerifiedTelemetryFingerprintType]
        >(VerifiedTelemetryReg.FingerprintType, [fingerprintType])

        this.fingerprintTemplate = this.addRegister(
            VerifiedTelemetryReg.FingerprintTemplate,
            [50, new Uint8Array(0)]
        )
        this.addCommand(
            VerifiedTelemetryCmd.ResetFingerprintTemplate,
            this.handleResetTelemetryTemplate.bind(this)
        )
        this.addCommand(
            VerifiedTelemetryCmd.RetrainFingerprintTemplate,
            this.handleRetrainTelemetryTemplate.bind(this)
        )

        // events
        this.telemetryStatus.on(CHANGE, () =>
            this.sendEvent(
                VerifiedTelemetryEvent.TelemetryStatusChange,
                this.telemetryStatus.data
            )
        )
        this.fingerprintTemplate.on(CHANGE, () =>
            this.sendEvent(VerifiedTelemetryEvent.FingerprintTemplateChange)
        )
    }

    private handleResetTelemetryTemplate() {
        this.fingerprintTemplate.setValues([50, new Uint8Array(0)])
    }

    private handleRetrainTelemetryTemplate() {
        this.fingerprintTemplate.setValues([50, new Uint8Array(0)])
    }
}
