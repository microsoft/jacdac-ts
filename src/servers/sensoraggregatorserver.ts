import { NumberFormat } from "../jdom/buffer"
import { CMD_GET_REG, SensorAggregatorReg, SensorAggregatorSampleType, SensorReg, SRV_SENSOR_AGGREGATOR, SystemReg } from "../jdom/constants"
import JDRegisterServer from "../jdom/registerserver"
import JDServiceServer, { ServerOptions } from "../jdom/serviceserver"

const inputsSettingsKey = "#jd-agg-inputs"

    function numberFmt(stype: SensorAggregatorSampleType) {
        switch (stype) {
            case SensorAggregatorSampleType.U8: return NumberFormat.UInt8LE
            case SensorAggregatorSampleType.I8: return NumberFormat.Int8LE
            case SensorAggregatorSampleType.U16: return NumberFormat.UInt16LE
            case SensorAggregatorSampleType.I16: return NumberFormat.Int16LE
            case SensorAggregatorSampleType.U32: return NumberFormat.UInt32LE
            case SensorAggregatorSampleType.I32: return NumberFormat.Int32LE
        }
    }

    class Collector extends Client {
        private requiredServiceNum: number
        lastSample: Buffer
        private parent: SensorAggregatorServer
        private numElts: number
        private sampleType: SensorAggregatorSampleType
        private sampleMult: number

        handlePacket(packet: Packet) {
            if (packet.serviceCommand == (CMD_GET_REG | SystemReg.Reading)) {
                this.parent._newData(packet.timestamp, false)
                const arr = packet.data.toArray(numberFmt(this.sampleType))
                for (let i = 0; i < arr.length; ++i)
                    this.lastSample.setNumber(NumberFormat.Float32LE, i << 2, arr[i] * this.sampleMult)
                this.parent._newData(packet.timestamp, true)
            }
        }

        _attach(dev: JDDevice, serviceNum: number) {
            if (this.requiredServiceNum && serviceNum != this.requiredServiceNum)
                return false
            return super._attach(dev, serviceNum)
        }

        announceCallback() {
            this.setReg(SensorReg.StreamingSamples, "u8", [255])
        }

        constructor(parent: SensorAggregatorServer, config: Buffer) {
            const [devIdBuf, serviceClass, serviceNum, sampleSize, sampleType, sampleShift] = jdunpack(config, "b[8] u32 u8 u8 u8 i8")
            const devId = devIdBuf.getNumber(NumberFormat.Int32LE, 0) == 0 ? null : devIdBuf.toHex()
            super(serviceClass, devId + ":" + serviceNum)
            this.requiredServiceNum = serviceNum
            this.sampleType = sampleType

            this.sampleMult = 1
            let sh = sampleShift
            while (sh > 0) {
                this.sampleMult /= 2
                sh--
            }
            while (sh < 0) {
                this.sampleMult *= 2
                sh++
            }

            this.numElts = Math.idiv(sampleSize, Buffer.sizeOfNumberFormat(numberFmt(this.sampleType)))
            this.lastSample = Buffer.create(this.numElts * 4)

            this.parent = parent
        }
    }

    export default class SensorAggregatorServer extends JDServiceServer {
        readonly inputs: JDRegisterServer<[number, number, ([Uint8Array, number, number, number, SensorAggregatorSampleType, number])[]]>
        readonly numSamples: JDRegisterServer<[number]>
        readonly sampleSize: JDRegisterServer<[number]>
        readonly streamingSamples: JDRegisterServer<[number]>
        readonly currentSample: JDRegisterServer<[Uint8Array]>
   
        private collectors: Collector[]
        private lastSample: number
        private samplesBuffer: Buffer

        newDataCallback: () => void

        constructor(options?: ServerOptions) {
            super(SRV_SENSOR_AGGREGATOR, options)

            // const [samplingInterval, samplesInWindow, rest] = jdunpack<[number, number, ([Uint8Array, number, number, number, SensorAggregatorSampleType, number])[]]>(buf, "u16 u16 x[4] r: b[8] u32 u8 u8 u8 i8")
            // const [deviceId, serviceClass, serviceNum, sampleSize, sampleType, sampleShift] = rest[0]
            this.inputs = this.addRegister(SensorAggregatorReg.Inputs, [50, 10, []])
            this.numSamples = this.addRegister(SensorAggregatorReg.NumSamples, [0])
            this.sampleSize = this.addRegister(SensorAggregatorReg.SampleSize, [0])
            this.streamingSamples = this.addRegister(SensorAggregatorReg.StreamingSamples, [0])
            this.currentSample = this.addRegister(SensorAggregatorReg.CurrentSample, [new Uint8Array(0)])
        }


        get samplesInWindow() {
            const [_, value] = this.inputs.values()
            return value;
        }

        set samplesInWindow(v: number) {
            if (!v || v <= 1) v = 1
            const inputValues = this.inputs.values()
            inputValues[1] = v
            this.inputs.setValues(inputValues)
            this.syncWindow()
        }

        get inputSettings() {
            return settings.readBuffer(inputsSettingsKey)
        }

        private syncWindow() {
            const samplesInWindow = this.samplesInWindow
            const [sampleSize] = this.sampleSize.values()

            if (sampleSize)
                this.samplesBuffer = new Uint8Array(samplesInWindow * sampleSize)
            else
                this.samplesBuffer = new Uint8Array(samplesInWindow)
        }

        private pushData() {
            this.samplesBuffer.shift(this.sampleSize)
            let off = this.samplesBuffer.length - this.sampleSize
            for (const coll of this.collectors) {
                this.samplesBuffer.write(off, coll.lastSample)
                off += coll.lastSample.length
            }
            this.numSamples++
            if (this.streamSamples > 0) {
                this.streamSamples--
                this.sendLastSample()
            }
        }

        _newData(timestamp: number, isPost: boolean) {
            if (!this.lastSample)
                this.lastSample = timestamp
            const d = timestamp - this.lastSample
            let numSamples = Math.idiv(d + (d >> 1), this.samplingInterval)
            if (!numSamples)
                return
            if (isPost) {
                this.lastSample = timestamp
                this.pushData()
                if (this.newDataCallback)
                    this.newDataCallback()
            } else {
                numSamples--
                if (numSamples > 5) numSamples = 5
                while (numSamples-- > 0)
                    this.pushData()
            }
        }

        start() {
            super.start()
            this.configureInputs()
        }

        private configureInputs() {
            const config = this.inputSettings
            if (!config)
                return
            /*
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

            [this.samplingInterval] = jdunpack(config, "u16")
            const entrySize = 16
            let off = 8
            for (const coll of this.collectors || [])
                coll.destroy()
            this.collectors = []
            let frameSz = 0
            while (off < config.length) {
                const coll = new Collector(this, config.slice(off, entrySize))
                coll.setReg(jacdac.SensorReg.StreamingInterval, "u32", [this.samplingInterval])
                coll.setReg(jacdac.SensorReg.StreamingSamples, "u8", [255])
                this.collectors.push(coll)
                frameSz += coll.lastSample.length
                off += entrySize
            }
            this.sampleSize = frameSz
            this.numSamples = 0
            this.syncWindow()
        }

        private sendLastSample() {
            const buf = this.samplesBuffer.slice(this.samplesBuffer.length - this.sampleSize, this.sampleSize)
            this.sendReport(JDPacket.from(jacdac.SensorAggregatorReg.CurrentSample | CMD_GET_REG, buf))
        }

        handlePacket(packet: JDPacket) {

            switch (packet.serviceCommand) {
                case jacdac.SensorAggregatorReg.Inputs | CMD_GET_REG:
                    this.sendReport(JDPacket.from(packet.serviceCommand, this.inputSettings))
                    break
                case jacdac.SensorAggregatorReg.Inputs | CMD_SET_REG:
                    if (this.inputSettings && packet.data.equals(this.inputSettings))
                        return // already done
                    settings.writeBuffer(inputsSettingsKey, packet.data)
                    this.configureInputs()
                    break
                case jacdac.SensorAggregatorReg.CurrentSample | CMD_GET_REG:
                    this.sendLastSample()
                    break;
            }
        }
    }

    //% whenUsed
    export const sensorAggregatorServer = new SensorAggregatorServer()
}