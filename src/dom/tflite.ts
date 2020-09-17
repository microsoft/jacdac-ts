import * as U from "./utils"
import { Packet } from "./packet"
import {
    REPORT_RECEIVE,
} from "./constants"
import { JDService } from "./service"
import { pack, unpack } from "./struct"
import { TFLiteCmd, SensorAggregatorSampleType, SensorAggregatorReg, TFLiteReg } from "./constants"
import { bufferToArray, NumberFormat } from "./buffer"
import { OutPipe } from "./pipes"
import { JDRegister } from "./register"
import { JDServiceClient } from "./serviceclient"

/*
    enum SampleType : u8 {
        U8 = 0x08
        I8 = 0x88
        U16 = 0x10
        I16 = 0x90
        U32 = 0x20
        I32 = 0xA0
    }
    rw inputs @ 0x80 {
        sampling_interval: u16 ms
        samples_in_window: u16
        reserved: u32
    repeats:
        device_id: u64
        service_class: u32
        service_num: u8
        sample_size: u8 bytes
        sample_type: SampleType
        sample_shift: i8
    }
*/

export class TFLiteClient extends JDServiceClient {
    constructor(service: JDService) {
        super(service)
        this.service.registersUseAcks = true
    }

    subscribeResults(handler: (sample: number[]) => void): () => void {
        const reg = this.service.register(TFLiteReg.Outputs)
        return reg.subscribe(REPORT_RECEIVE, () => {
            handler(bufferToArray(reg.data, NumberFormat.Float32LE))
        })
    }

    async deployModel(model: Uint8Array) {
        const resp = await this.service.sendCmdAwaitResponseAsync(Packet.packed(TFLiteCmd.SetModel, "I", [model.length]), 3000)
        const [pipePort] = unpack(resp.data, "H")
        if (!pipePort)
            throw new Error("wrong port " + pipePort)
        const pipe = new OutPipe(this.service.device, pipePort)
        const chunkSize = 224 // has to be divisible by 8
        for (let i = 0; i < model.length; i += chunkSize)
            await pipe.send(model.slice(i, i + chunkSize))
        try {
            await pipe.close()
        } catch {
            // the device may restart before we manage to close
        }
    }

    async autoInvoke(everySamples = 1) {
        await this.service.register(TFLiteReg.AutoInvokeEvery).sendSetIntAsync(everySamples)
    }

    private async getReg(id: SensorAggregatorReg | TFLiteReg, f: (v: JDRegister) => any) {
        const reg = this.service.register(id)
        await reg.refresh()
        return f(reg)
    }

    async modelStats(): Promise<TFModelStats> {
        const info: any = {
            "modelSize": this.getReg(TFLiteReg.ModelSize, r => r.intValue),
            "arenaSize": this.getReg(TFLiteReg.AllocatedArenaSize, r => r.intValue),
            "inputShape": this.getReg(TFLiteReg.InputShape, r => bufferToArray(r.data, NumberFormat.UInt16LE)),
            "outputShape": this.getReg(TFLiteReg.OutputShape, r => bufferToArray(r.data, NumberFormat.UInt16LE)),
            "lastError": this.getReg(TFLiteReg.LastError, r => U.uint8ArrayToString(r.data)),
        }
        for (const id of Object.keys(info)) {
            info[id] = await info[id]
        }
        return info
    }
}

export interface TFModelStats {
    "modelSize": number;
    "arenaSize": number;
    "inputShape": number[];
    "outputShape": number[];
    "lastError": string;
}

/*
export async function testTF(bus: JDBus, model: Uint8Array) {
    const tfService = bus.services({ serviceClass: SRV_TFLITE })[0]
    if (!tfService) {
        console.log("no tflite service")
        return
    }
    const tf = new TFLiteClient(tfService)

    if (model)
        await tf.deployModel(model)

    const st = await tf.modelStats()
    console.log(st)

    let acc = bus.services({ serviceClass: SRV_ACCELEROMETER })
    if (acc.length == 0) {
        console.log("no acc service")
        return
    }
    acc = acc.concat(bus.services({ serviceClass: SRV_SLIDER }))
    stableSortServices(acc)
    await tf.setInputs({
        samplesInWindow: 50,
        samplingInterval: 20,
        inputs: acc,
        freeze: acc.length > 1
    })

    tf.subscribeSample(sample => {
        console.log("SAMPLE", sample)
    })

    const classNames = ['noise', 'punch', 'left', 'right'];
    tf.subscribeResults(outp => {
        for (let i = 0; i < outp.length; ++i) {
            if (outp[i] > 0.7) {
                console.log(outp[i].toFixed(3) + " " + classNames[i])
            }
        }
        // console.log("OUT", outp)
    })

    await tf.autoInvoke(8)

    let prev = 0
    while (true) {
        await U.delay(1000)
        const st = await tf.execStats()
        console.log(st.numSamples - prev, st)
        prev = st.numSamples
    }
}
*/