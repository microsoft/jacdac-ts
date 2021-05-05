namespace modules {
    /**
     * Support for sending and receiving packets using the [Bit Radio protocol](https://github.com/microsoft/pxt-common-packages/blob/master/libs/radio/docs/reference/radio.md), typically used between micro:bit devices.
     **/
    //% fixedInstances blockGap=8
    export class BitRadioClient extends jacdac.Client {

        private readonly _enabled : jacdac.RegisterClient<[boolean]>;
        private readonly _group : jacdac.RegisterClient<[number]>;
        private readonly _transmissionPower : jacdac.RegisterClient<[number]>;
        private readonly _frequencyBand : jacdac.RegisterClient<[number]>;            

        constructor(role: string) {
            super(jacdac.SRV_BIT_RADIO, role);

            this._enabled = this.addRegister<[boolean]>(jacdac.BitRadioReg.Enabled, "u8");
            this._group = this.addRegister<[number]>(jacdac.BitRadioReg.Group, "u8");
            this._transmissionPower = this.addRegister<[number]>(jacdac.BitRadioReg.TransmissionPower, "u8");
            this._frequencyBand = this.addRegister<[number]>(jacdac.BitRadioReg.FrequencyBand, "u8");            
        }
    

        /**
        * Turns on/off the radio antenna.
        */
        //% callInDebugger
        //% group="Bit:radio"
        //% block="%bitradio enabled"
        //% blockId=jacdac_bitradio_enabled___get
        //% weight=100
        enabled(): boolean {
            this.start();            
            const values = this._enabled.pauseUntilValues() as any[];
            return !!values[0];
        }

        /**
        * Turns on/off the radio antenna.
        */
        //% group="Bit:radio"
        //% blockId=jacdac_bitradio_enabled___set
        //% block="set %bitradio %value=toggleOnOff"
        //% weight=99
        setEnabled(value: boolean) {
            this.start();
            const values = this._enabled.values as any[];
            values[0] = value ? 1 : 0;
            this._enabled.values = values as [boolean];
        }

        /**
        * Group used to filter packets
        */
        //% callInDebugger
        //% group="Bit:radio"
        //% weight=98
        group(): number {
            this.start();            
            const values = this._group.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Group used to filter packets
        */
        //% group="Bit:radio"
        //% weight=97
        //% value.min=0
        //% value.max=255
        setGroup(value: number) {
            this.start();
            const values = this._group.values as any[];
            values[0] = value;
            this._group.values = values as [number];
        }

        /**
        * Antenna power to increase or decrease range.
        */
        //% callInDebugger
        //% group="Bit:radio"
        //% weight=96
        transmissionPower(): number {
            this.start();            
            const values = this._transmissionPower.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Antenna power to increase or decrease range.
        */
        //% group="Bit:radio"
        //% weight=95
        //% value.min=1
        //% value.max=7
        //% value.defl=6
        setTransmissionPower(value: number) {
            this.start();
            const values = this._transmissionPower.values as any[];
            values[0] = value;
            this._transmissionPower.values = values as [number];
        }

        /**
        * Change the transmission and reception band of the radio to the given channel.
        */
        //% callInDebugger
        //% group="Bit:radio"
        //% weight=94
        frequencyBand(): number {
            this.start();            
            const values = this._frequencyBand.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Change the transmission and reception band of the radio to the given channel.
        */
        //% group="Bit:radio"
        //% weight=93
        //% value.min=0
        //% value.max=83
        //% value.defl=7
        setFrequencyBand(value: number) {
            this.start();
            const values = this._frequencyBand.values as any[];
            values[0] = value;
            this._frequencyBand.values = values as [number];
        }


        /**
        * Sends a string payload as a radio message, maximum 18 characters.
        */
        //% group="Bit:radio"
        //% blockId=jacdac_bitradio_send_string_cmd
        //% block="%bitradio send string"
        //% weight=92
        sendString(message: string): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.jdpacked(jacdac.BitRadioCmd.SendString, "s", [message]))
        }

        /**
        * Sends a double precision number payload as a radio message
        */
        //% group="Bit:radio"
        //% blockId=jacdac_bitradio_send_number_cmd
        //% block="%bitradio send number"
        //% weight=91
        sendNumber(value: number): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.jdpacked(jacdac.BitRadioCmd.SendNumber, "f64", [value]))
        }

        /**
        * Sends a double precision number and a name payload as a radio message
        */
        //% group="Bit:radio"
        //% blockId=jacdac_bitradio_send_value_cmd
        //% block="%bitradio send value"
        //% weight=90
        sendValue(value: number, name: string): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.jdpacked(jacdac.BitRadioCmd.SendValue, "f64 s", [value, name]))
        }

        /**
        * Sends a payload of bytes as a radio message
        */
        //% group="Bit:radio"
        //% blockId=jacdac_bitradio_send_buffer_cmd
        //% block="%bitradio send buffer"
        //% weight=89
        sendBuffer(data: Buffer): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.jdpacked(jacdac.BitRadioCmd.SendBuffer, "b", [data]))
        }
    
    }
    //% fixedInstance whenUsed block="bit radio 1"
    export const bitRadio1 = new BitRadioClient("bit Radio1");
}