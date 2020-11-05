import * as U from "./utils"
import {
    SRV_MICROPHONE,
    MicrophoneCmd,
    MicrophoneReg
} from "./constants"
import { pack } from "./struct"
import { InPipeReader } from "./pipes"
import { JDBus } from "./bus"


function downloadUrl(name: string, url: string) {
    const a = document.createElement("a") as HTMLAnchorElement;
    document.body.appendChild(a);
    a.style.display = "none";
    a.href = url;
    a.download = name;
    a.click();
}

export function toWav(hz: number, buf: Int16Array) {
    const res = new Uint8Array(buf.buffer.byteLength + 44)
    res.set(U.stringToUint8Array("RIFF....WAVEfmt "), 0)
    U.write32(res, 4, 36 + buf.buffer.byteLength)
    const channels = 1
    res.set(pack("IHHIIHHII", [
        16,
        1, // PCM
        channels, // mono
        hz,
        hz * channels * 2,
        channels * 2,
        16,
        0x61_74_61_64, // "data"
        buf.buffer.byteLength
    ]), 16)
    res.set(new Uint8Array(buf.buffer), 44)
    return res
}

function amplify(buf: Int16Array, factor: number) {
    let numclamp = 0
    buf = buf.map(x => {
        const r = x * factor
        const r2 = Math.max(Math.min(0x7fff, r), -0x8000)
        if (r != r2)
            numclamp++
        return r2
    })
    console.log(`amplify ${factor} => ${(numclamp * 100 / buf.length).toFixed(3)}% clamped`)
    return buf
}

export async function testMic(bus: JDBus) {
    const micService = bus.services({ serviceClass: SRV_MICROPHONE })[0]
    if (!micService) {
        console.log("no mic service")
        return
    }
    const reg = micService.register(MicrophoneReg.SamplingPeriod)
    await reg.refresh()
    const samplingHz = Math.round(1_000_000 / reg.intValue)

    const buf = await record(3)

    let buf16 = new Int16Array(buf.buffer)
    console.log(buf16)

    // 16x amplification
    buf16 = amplify(buf16, 16)

    const wav = toWav(samplingHz, buf16)

    const url = `data:audio/wav;base64,${btoa(U.uint8ArrayToString(wav))}`
    downloadUrl("mic.wav", url)

    async function record(seconds: number) {
        const pipe = new InPipeReader(bus)
        await micService.sendPacketAsync(
            pipe.openCommand(MicrophoneCmd.Sample, pack("I", [seconds * samplingHz])), true)
        const bufs = await pipe.readData(seconds * 1200 + 300)
        return U.bufferConcatMany(bufs)
    }

}
