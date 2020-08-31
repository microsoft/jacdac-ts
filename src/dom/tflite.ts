import * as U from "./utils"
import { JDBus } from "./bus"
import { Packet } from "./packet"
import {
    PACKET_RECEIVE, JD_SERIAL_MAX_PAYLOAD_SIZE, REPORT_RECEIVE, SRV_TFLITE, SRV_ACCELEROMETER, SRV_SLIDER
} from "./constants"
import { JDService } from "./service"
import { pack, unpack } from "./struct"
import { TFLiteSampleType, TFLiteReg } from "./constants"
import { isReading } from "./spec"
import { bufferToArray, NumberFormat } from "./buffer"
import { OutPipe } from "./pipes"
import { TFLiteCmd } from "../../jacdac-spec/dist/specconstants"

export interface InputConfig {
    samplingInterval: number; // ms
    samplesInWindow: number;
    freeze?: boolean;
    inputs: JDService[];
}

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

export class TFLiteClient {
    constructor(private service: JDService) {
        this.service.registersUseAcks = true
    }

    async setInputs(cfg: InputConfig) {
        function error(msg: string) {
            throw new Error("TFLite inputs: " + msg)
        }
        function mapType(tp: number) {
            switch (tp) {
                case 1: return TFLiteSampleType.U8
                case 2: return TFLiteSampleType.U16
                case 4: return TFLiteSampleType.U32
                case -1: return TFLiteSampleType.I8
                case -2: return TFLiteSampleType.I16
                case -4: return TFLiteSampleType.I32
                default:
                    error("unknown storage type")
            }
        }
        let totalSampleSize = 0
        const inputs = cfg.inputs.map(inp => {
            const readingReg = inp.specification.packets.find(isReading)
            let sampleType: TFLiteSampleType = undefined
            let sampleSize = 0
            let sampleShift = 0
            for (const field of readingReg.fields) {
                sampleSize += Math.abs(field.storage)
                if (sampleType === undefined) {
                    sampleType = mapType(field.storage)
                    sampleShift = field.shift || 0
                }
                if (sampleType != mapType(field.storage) || sampleShift != (field.shift || 0))
                    error("heterogenous field types")
            }
            totalSampleSize += sampleSize
            return U.bufferConcat(
                cfg.freeze ? U.fromHex(inp.device.deviceId) : new Uint8Array(8),
                pack("IBBBb", [
                    inp.serviceClass,
                    cfg.freeze ? inp.service_number : 0,
                    sampleSize,
                    sampleType,
                    sampleShift
                ])
            )
        })

        if (totalSampleSize > JD_SERIAL_MAX_PAYLOAD_SIZE)
            error("samples won't fit in packet")

        inputs.unshift(pack("HHI", [cfg.samplingInterval, cfg.samplesInWindow, 0]))
        await this.service.register(TFLiteReg.Inputs).sendSetAsync(U.bufferConcatMany(inputs))
    }

    async collect(numSamples: number) {
        await this.service.register(TFLiteReg.StreamSamples).sendSetIntAsync(numSamples)
    }

    onSample(handler: (sample: number[]) => void) {
        const reg = this.service.register(TFLiteReg.CurrentSample)
        reg.on(REPORT_RECEIVE, () => {
            handler(bufferToArray(reg.data, NumberFormat.Float32LE))
        })
    }

    async deployModel(model: Uint8Array) {
        const resp = await this.service.sendCmdAwaitResponseAsync(Packet.packed(TFLiteCmd.SetModel, "I", [model.length]))
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
}

export function stableSortServices(services: JDService[]) {
    services.sort((a, b) =>
        a.serviceClass - b.serviceClass ||
        U.strcmp(a.device.deviceId, b.device.deviceId) ||
        a.service_number - b.service_number)
}

export async function testTF(bus: JDBus) {
    const tfService = bus.services({ serviceClass: SRV_TFLITE })[0]
    if (!tfService) {
        console.log("no tflite service")
        return
    }
    const tf = new TFLiteClient(tfService)

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
    tf.onSample(sample => {
        console.log(sample)
    })
    for (let i = 0; i < 3; ++i) {
        await tf.collect(10)
        await U.delay(1000)
    }
}
