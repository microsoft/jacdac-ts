import { BuzzerCmd, BuzzerReg, CHANGE, SRV_BUZZER } from "../jdom/constants";
import { jdunpack } from "../jdom/pack";
import Packet from "../jdom/packet";
import JDRegisterHost from "../jdom/registerhost";
import JDServiceHost from "../jdom/servicehost";

let ctx: AudioContext;
let volumeNode: GainNode;
const VOLUME_SCALE = 1500;
let volume: number = 200;

export function initAudioContext() {
    if (ctx === undefined) {
        try {
            const context = typeof window !== undefined && new window.AudioContext();
            // play silence sound within onlick to unlock it
            const buffer = context.createBuffer(1, 1, 22050);
            const source = context.createBufferSource();
            source.buffer = buffer;
            source.connect(context.destination);
            source.start();
            ctx = context;
            console.log(`audio context created`)
        }
        catch (e) {
            console.log(e);
            ctx = null;
        }
    }
}

async function setVolume(vol: number) {
    volume = vol;
    if (ctx && volumeNode) {
        try {
            const v = volume / VOLUME_SCALE;
            volumeNode.gain.value = v;
        }
        catch (e) {
            console.log(e)
        }
    }
}

async function playTone(frequency: number, duration: number) {
    initAudioContext();
    if (ctx) {
        try {
            volumeNode = ctx.createGain();
            volumeNode.connect(ctx.destination);
            volumeNode.gain.value = volume / VOLUME_SCALE;
            const tone = ctx.createOscillator();
            tone.type = "sawtooth";
            tone.connect(volumeNode);
            tone.frequency.value = frequency; // update frequency
            tone.start(); // start and stop
            tone.stop(ctx.currentTime + duration / 1000);
        }
        catch (e) {
            console.log(e)
        }
    }
}

export default class BuzzerServiceHost extends JDServiceHost {
    readonly volume: JDRegisterHost<[number]>;
    constructor() {
        super(SRV_BUZZER);

        this.volume = this.addRegister<[number]>(BuzzerReg.Volume, [200]);
        this.volume.on(CHANGE, this.handleVolumeChange.bind(this))
        this.addCommand(BuzzerCmd.PlayTone, this.handlePlayTone.bind(this));
    }

    private handleVolumeChange() {
        const [v] = this.volume.values();
        setVolume(v) // don't be too loud
    }

    private handlePlayTone(pkt: Packet) {
        const [period, duty, duration] = jdunpack<[number, number, number]>(pkt.data, "u16 u16 u16")

        const [v] = this.volume.values();
        const frequency = 1000000 / period;

        playTone(frequency, duration);
    }
}