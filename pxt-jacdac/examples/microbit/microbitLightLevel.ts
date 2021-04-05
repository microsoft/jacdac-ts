namespace microbit {
    export const SRV_LIGHT_LEVEL = 0x17dc9a1c
    export class LightLevel extends jacdac.SensorHost {
        constructor() {
            super("microbitLight", SRV_LIGHT_LEVEL)
        }

        public serializeState(): Buffer {
            return jacdac.jdpack("u0.16", [input.lightLevel()/255]);
        }
    }
}