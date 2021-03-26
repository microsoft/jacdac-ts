namespace microbit {
    export class LightLevel extends jacdac.SensorHost {
        constructor() {
            super("microbitLight", jacdac.SRV_LIGHT_LEVEL)
        }

        public serializeState(): Buffer {
            return jacdac.jdpack("u0.16", [input.lightLevel()/255]);
        }
    }
}