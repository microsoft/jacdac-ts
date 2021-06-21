namespace servers {
    const SRV_ACCELEROMETER = 0x1f140409
    export class AccelerometerServer extends jacdac.SensorServer {
        private lastEvent: number = -1
        constructor() {
            super("accelerometer", SRV_ACCELEROMETER)
            input.onGesture(Gesture.Shake, function () {
                this.sendEvent(0x8b)
            })
            input.onGesture(Gesture.ScreenUp, function () {
                this.sendEvent(0x85)
            })
            input.onGesture(Gesture.ScreenDown, function () {
                this.sendEvent(0x86)
            })
            input.onGesture(Gesture.LogoUp, function () {
                this.sendEvent(0x81)
            })
            input.onGesture(Gesture.LogoDown, function () {
                this.sendEvent(0x82)
            })
            input.onGesture(Gesture.TiltLeft, function () {
                this.sendEvent(0x83)
            })
            input.onGesture(Gesture.TiltRight, function () {
                this.sendEvent(0x84)
            })
            input.onGesture(Gesture.FreeFall, function () {
                this.sendEvent(0x87)
            })
        }

        public serializeState(): Buffer {
            let ax = input.acceleration(Dimension.X) / 1000
            let ay = input.acceleration(Dimension.Y) / 1000
            let az = input.acceleration(Dimension.Z) / 1000
            return jacdac.jdpack("i12.20 i12.20 i12.20", [ax, ay, az])
        }
    }

    //% fixedInstance whenUsed block="accelerometer"
    export const accelerometerServer = new AccelerometerServer()
}
