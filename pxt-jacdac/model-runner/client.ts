namespace jacdac {
    function unpackArray(buf: Buffer, fmt: NumberFormat) {
        const sz = Buffer.sizeOfNumberFormat(fmt)
        const res: number[] = []
        for (let i = 0; i < buf.length; i += sz)
            res.push(buf.getNumber(fmt, i))
        return res
    }

    //% fixedInstances
    //% blockGap=8
    export class ModelRunnerClient extends Client {
        constructor(role: string) {
            super(jacdac.SRV_MODEL_RUNNER, role);
        }

        private _autoInv: number
        private _currClass = 0
        private _minScore = 0.8

        private autoStart() {
            this.start()
            if (this._autoInv == null) {
                this.autoInvoke()
            }
        }

        autoInvoke(numSamples = 10) {
            this._autoInv = numSamples
            this.setReg(jacdac.ModelRunnerReg.AutoInvokeEvery, "u16", [numSamples])
        }

        handlePacket(pkt: JDPacket) {
            if (pkt.serviceCommand == (jacdac.ModelRunnerReg.Outputs | CMD_GET_REG)) {
                const scores = unpackArray(pkt.data, NumberFormat.Float32LE)
                for (let i = 0; i < scores.length; ++i) {
                    if (scores[i] > this._minScore) {
                        if (this._currClass != i) {
                            this._currClass = i
                            this.raiseEvent(this._currClass + 1000, 0)
                        }
                        break
                    }
                }
            }
        }

        /**
         * Run code when a specific even is detected in input data.
         */
        //% group="Machine Learning"
        //% blockId=jacadacmrundetect block="on %modelRunner ML class %classId detected"
        onDetection(classId: number, handler: () => void) {
            this.autoStart()
            this.registerEvent(classId + 1000, handler);
        }
    }

    /**
     * Default model runner
     */
    //% fixedInstance
    export const modelRunner = new ModelRunnerClient("model_runner");
}