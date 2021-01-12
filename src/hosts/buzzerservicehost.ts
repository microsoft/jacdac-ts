import { BuzzerCmd, BuzzerReg, CHANGE, SRV_BUZZER } from "../jdom/constants";
import { jdunpack } from "../jdom/pack";
import Packet from "../jdom/packet";
import JDRegisterHost from "../jdom/registerhost";
import JDServiceHost from "../jdom/servicehost";

let ctx: AudioContext;
let volumeNode: GainNode;
let volume: number = 20;

function init() {
    if (ctx === undefined) {
        try {
            ctx = typeof window !== undefined && new window.AudioContext();
        }
        catch (e) {
            ctx = null;
            return undefined;
        }
    }
}

async function setVolume(vol: number) {
    volume = vol;
    if (ctx && volumeNode) {
        try {
            volumeNode.gain.value = volume / (0xff * 3);
        }
        catch (e) {
            console.log(e)
        }
    }
}

async function playTone(frequency: number, duration: number) {
    init();
    if (ctx) {
        try {
            volumeNode = ctx.createGain();
            volumeNode.connect(ctx.destination);
            volumeNode.gain.value = volume / (0xff * 3);
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
    readonly volume: JDRegisterHost;
    constructor() {
        super(SRV_BUZZER);

        this.volume = this.addRegister(BuzzerReg.Volume, "u8", [20]);
        this.volume.on(CHANGE, this.handleVolumeChange.bind(this))
        this.addCommand(BuzzerCmd.PlayTone, this.handlePlayTone.bind(this));
    }

    private handleVolumeChange() {
        const [v] = this.volume.values<[number]>();

        setVolume(v) // don't be too loud
    }

    private handlePlayTone(pkt: Packet) {
        const [period, duty, duration] = jdunpack<[number, number, number]>(pkt.data, "u16 u16 u16")

        const [v] = this.volume.values<[number]>();
        const frequency = 1000000 / period;

        playTone(frequency, duration);
    }
}