namespace microbit {
    export class SoundLevel extends jacdac.SensorHost {
        constructor() {
            super("microbitSound", 0x14ad1a5d)
        }

        public serializeState(): Buffer {
            return jacdac.jdpack("u0.16", [input.soundLevel()/255]);
        }
    }
}