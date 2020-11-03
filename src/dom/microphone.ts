import * as U from "./utils"
import {
    SRV_MICROPHONE,
    MicrophoneCmd,
    MicrophoneReg
} from "./constants"
import { pack } from "./struct"
import { InPipeReader } from "./pipes"
import { JDBus } from "./bus"

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
    console.log(new Int16Array(buf.buffer))
}
