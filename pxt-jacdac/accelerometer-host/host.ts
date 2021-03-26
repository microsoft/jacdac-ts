namespace jacdac {
    export class AccelerometerHost extends jacdac.SensorHost {
        constructor(dev: string) {
            super(dev, jacdac.SRV_ACCELEROMETER);

            // todo events
        }

        serializeState(): Buffer {
            const x = input.acceleration(Dimension.X)
            const y = input.acceleration(Dimension.Y)
            const z = input.acceleration(Dimension.Z)
            
            return jacdac.jdpack("i12.20 i12.20 i12.20", [x, y, z]);
        }
    }
}
