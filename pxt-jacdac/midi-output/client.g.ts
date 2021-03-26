namespace modules {
    /**
     * A MIDI output device.
     **/
    //% fixedInstances blockGap=8
    export class MidiOutputClient extends jacdac.Client {

        private readonly _enabled : jacdac.RegisterClient<[boolean]>;            

        constructor(role: string) {
            super(jacdac.SRV_MIDI_OUTPUT, role);

            this._enabled = this.addRegister<[boolean]>(jacdac.MidiOutputReg.Enabled, "u8");            
        }
    

        /**
        * Opens or closes the port to the MIDI device
        */
        //% callInDebugger
        //% group="Sound"
        //% block="%midioutput enabled"
        //% blockId=jacdac_midioutput_enabled___get
        //% weight=100
        enabled(): boolean {
            this.start();            
            const values = this._enabled.pauseUntilValues() as any[];
            return !!values[0];
        }

        /**
        * Opens or closes the port to the MIDI device
        */
        //% group="Sound"
        //% blockId=jacdac_midioutput_enabled___set
        //% block="set %midioutput %value=toggleOnOff"
        //% weight=99
        setEnabled(value: boolean) {
            this.start();
            const values = this._enabled.values as any[];
            values[0] = value ? 1 : 0;
            this._enabled.values = values as [boolean];
        }


        /**
        * Clears any pending send data that has not yet been sent from the MIDIOutput's queue.
        */
        //% group="Sound"
        //% blockId=jacdac_midioutput_clear_cmd
        //% block="%midioutput clear"
        //% weight=98
        clear(): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.onlyHeader(jacdac.MidiOutputCmd.Clear))
        }

        /**
        * Enqueues the message to be sent to the corresponding MIDI port
        */
        //% group="Sound"
        //% blockId=jacdac_midioutput_send_cmd
        //% block="%midioutput send"
        //% weight=97
        send(data: Buffer): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.jdpacked(jacdac.MidiOutputCmd.Send, "b", [data]))
        }
    
    }
    //% fixedInstance whenUsed
    export const midiOutput = new MidiOutputClient("midi Output");
}