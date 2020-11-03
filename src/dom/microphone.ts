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

export async function testMic(bus: JDBus) {
    const micService = bus.services({ serviceClass: SRV_MICROPHONE })[0]
    if (!micService) {
        console.log("no mic service")
        return
    }
    const reg = micService.register(MicrophoneReg.SamplingPeriod)
    await reg.refresh()
    const samplingHz = Math.round(1_000_000 / reg.intValue)
    const seconds = 3
    const pipe = new InPipeReader(bus)
    await micService.sendPacketAsync(
        pipe.openCommand(MicrophoneCmd.Sample, pack("I", [seconds * samplingHz])), true)
    const bufs = await pipe.readData(seconds * 2100 + 300)
    const buf = U.bufferConcatMany(bufs)
    const buf16 = new Int16Array(buf.buffer)
    console.log(buf16)
    const wav = toWav(samplingHz, buf16)

    const url = `data:audio/wav;base64,${btoa(U.uint8ArrayToString(wav))}`
    downloadUrl("mic.wav", url)
}
