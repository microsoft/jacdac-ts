namespace modules {
    /**
     * Runs machine learning models.
     * 
     * Only models with a single input tensor and a single output tensor are supported at the moment.
     * Input is provided by Sensor Aggregator service on the same device.
     * Multiple instances of this service may be present, if more than one model format is supported by a device.
     **/
    //% fixedInstances blockGap=8
    export class ModelRunnerClient extends jacdac.SensorClient<[number[]]> {

        private readonly _autoInvokeEvery : jacdac.RegisterClient<[number]>;
        private readonly _inputShape : jacdac.RegisterClient<[number[]]>;
        private readonly _outputShape : jacdac.RegisterClient<[number[]]>;
        private readonly _lastRunTime : jacdac.RegisterClient<[number]>;
        private readonly _allocatedArenaSize : jacdac.RegisterClient<[number]>;
        private readonly _modelSize : jacdac.RegisterClient<[number]>;
        private readonly _lastError : jacdac.RegisterClient<[string]>;
        private readonly _format : jacdac.RegisterClient<[jacdac.ModelRunnerModelFormat]>;
        private readonly _formatVersion : jacdac.RegisterClient<[number]>;
        private readonly _parallel : jacdac.RegisterClient<[boolean]>;            

        constructor(role: string) {
            super(jacdac.SRV_MODEL_RUNNER, role, "r: f32");

            this._autoInvokeEvery = this.addRegister<[number]>(jacdac.ModelRunnerReg.AutoInvokeEvery, "u16");
            this._inputShape = this.addRegister<[number[]]>(jacdac.ModelRunnerReg.InputShape, "r: u16");
            this._outputShape = this.addRegister<[number[]]>(jacdac.ModelRunnerReg.OutputShape, "r: u16");
            this._lastRunTime = this.addRegister<[number]>(jacdac.ModelRunnerReg.LastRunTime, "u32");
            this._allocatedArenaSize = this.addRegister<[number]>(jacdac.ModelRunnerReg.AllocatedArenaSize, "u32");
            this._modelSize = this.addRegister<[number]>(jacdac.ModelRunnerReg.ModelSize, "u32");
            this._lastError = this.addRegister<[string]>(jacdac.ModelRunnerReg.LastError, "s");
            this._format = this.addRegister<[jacdac.ModelRunnerModelFormat]>(jacdac.ModelRunnerReg.Format, "u32");
            this._formatVersion = this.addRegister<[number]>(jacdac.ModelRunnerReg.FormatVersion, "u32");
            this._parallel = this.addRegister<[boolean]>(jacdac.ModelRunnerReg.Parallel, "u8");            
        }
    

        /**
        * When register contains `N > 0`, run the model automatically every time new `N` samples are collected.
        * Model may be run less often if it takes longer to run than `N * sampling_interval`.
        * The `outputs` register will stream its value after each run.
        * This register is not stored in flash.
        */
        //% callInDebugger
        //% group="Model Runner"
        //% weight=100
        autoInvokeEvery(): number {
            this.start();            
            const values = this._autoInvokeEvery.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * When register contains `N > 0`, run the model automatically every time new `N` samples are collected.
        * Model may be run less often if it takes longer to run than `N * sampling_interval`.
        * The `outputs` register will stream its value after each run.
        * This register is not stored in flash.
        */
        //% group="Model Runner"
        //% weight=99
        setAutoInvokeEvery(value: number) {
            this.start();
            const values = this._autoInvokeEvery.values as any[];
            values[0] = value;
            this._autoInvokeEvery.values = values as [number];
        }

        /**
        * Results of last model invocation as `float32` array.
        */
        //% callInDebugger
        //% group="Model Runner"
        //% block="%modelrunner output"
        //% blockId=jacdac_modelrunner_outputs_output_get
        //% weight=98
        output(): number[] {
            this.setStreaming(true);            
            const values = this._reading.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * The shape of the input tensor.
        */
        //% callInDebugger
        //% group="Model Runner"
        //% weight=97
        inputShapeDimension(): number[] {
            this.start();            
            const values = this._inputShape.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * The shape of the output tensor.
        */
        //% callInDebugger
        //% group="Model Runner"
        //% weight=96
        outputShapeDimension(): number[] {
            this.start();            
            const values = this._outputShape.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * The time consumed in last model execution.
        */
        //% callInDebugger
        //% group="Model Runner"
        //% weight=95
        lastRunTime(): number {
            this.start();            
            const values = this._lastRunTime.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Number of RAM bytes allocated for model execution.
        */
        //% callInDebugger
        //% group="Model Runner"
        //% weight=94
        allocatedArenaSize(): number {
            this.start();            
            const values = this._allocatedArenaSize.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * The size of the model in bytes.
        */
        //% callInDebugger
        //% group="Model Runner"
        //% weight=93
        modelSize(): number {
            this.start();            
            const values = this._modelSize.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Textual description of last error when running or loading model (if any).
        */
        //% callInDebugger
        //% group="Model Runner"
        //% weight=92
        lastError(): string {
            this.start();            
            const values = this._lastError.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * The type of ML models supported by this service.
        * `TFLite` is flatbuffer `.tflite` file.
        * `ML4F` is compiled machine code model for Cortex-M4F.
        * The format is typically present as first or second little endian word of model file.
        */
        //% callInDebugger
        //% group="Model Runner"
        //% weight=91
        format(): jacdac.ModelRunnerModelFormat {
            this.start();            
            const values = this._format.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * A version number for the format.
        */
        //% callInDebugger
        //% group="Model Runner"
        //% weight=90
        formatVersion(): number {
            this.start();            
            const values = this._formatVersion.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * If present and true this service can run models independently of other
        * instances of this service on the device.
        */
        //% callInDebugger
        //% group="Model Runner"
        //% weight=89
        parallel(): boolean {
            this.start();            
            const values = this._parallel.pauseUntilValues() as any[];
            return !!values[0];
        }


        /**
        * Open pipe for streaming in the model. The size of the model has to be declared upfront.
        * The model is streamed over regular pipe data packets.
        * The format supported by this instance of the service is specified in `format` register.
        * When the pipe is closed, the model is written all into flash, and the device running the service may reset.
        */
        //% group="Model Runner"
        //% blockId=jacdac_modelrunner_set_model_cmd
        //% block="%modelrunner set model"
        //% weight=88
        setModel(modelSize: number): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.jdpacked(jacdac.ModelRunnerCmd.SetModel, "u32", [modelSize]))
        }
    
    }
    //% fixedInstance whenUsed block="model runner 1"
    export const modelRunner1 = new ModelRunnerClient("model Runner1");
}