import { PACKET_DATA_NORMALIZE, ServoReg, SRV_SERVO } from "../jdom/constants"
import { JDRegisterServer } from "../jdom/servers/registerserver"
import { JDServiceServer, JDServerOptions } from "../jdom/servers/serviceserver"

export class ServoServer extends JDServiceServer {
    readonly angle: JDRegisterServer<[number]>
    readonly offset: JDRegisterServer<[number]>
    readonly enabled: JDRegisterServer<[boolean]>
    readonly minAngle: JDRegisterServer<[number]>
    readonly maxAngle: JDRegisterServer<[number]>
    readonly responseSpeed: JDRegisterServer<[number]>
    readonly stallTorque: JDRegisterServer<[number]>

    constructor(
        options?: {
            minAngle?: number
            maxAngle?: number
            responseSpeed?: number
            stallTorque?: number
        } & JDServerOptions,
    ) {
        super(SRV_SERVO, options)
        const {
            minAngle = 0,
            maxAngle = 180,
            responseSpeed,
            stallTorque,
        } = options || {}

        this.angle = this.addRegister<[number]>(ServoReg.Angle, [0])
        this.enabled = this.addRegister<[boolean]>(ServoReg.Enabled, [false])
        this.minAngle = this.addRegister<[number]>(ServoReg.MinAngle, [
            minAngle,
        ])
        this.maxAngle = this.addRegister<[number]>(ServoReg.MaxAngle, [
            maxAngle,
        ])
        this.offset = this.addRegister<[number]>(ServoReg.Offset, [0])
        this.responseSpeed = this.addRegister<[number]>(
            ServoReg.ResponseSpeed,
            responseSpeed !== undefined ? [responseSpeed] : undefined,
        )
        this.stallTorque = this.addRegister<[number]>(
            ServoReg.StallTorque,
            stallTorque !== undefined ? [stallTorque] : undefined,
        )

        this.angle.on(PACKET_DATA_NORMALIZE, (values: [number]) => {
            let angle = values[0]
            const [minAngle] = this.minAngle.values()
            const [maxAngle] = this.maxAngle.values()
            if (minAngle !== undefined) angle = Math.max(minAngle, angle)
            if (maxAngle !== undefined) angle = Math.min(maxAngle, angle)
            values[0] = angle
        })
    }
}
