namespace microbit {
    const SRV_LIGHT_LEVEL = 0x17dc9a1c
    export class LightLevelServer extends jacdac.SensorServer {
        constructor() {
            super("light level", SRV_LIGHT_LEVEL)
        }

        public serializeState(): Buffer {
            return jacdac.jdpack("u0.16", [input.lightLevel()/255]);
        }
    }

    //% fixedInstance whenUsed
    export const lightLevelServer = new LightLevelServer()
}