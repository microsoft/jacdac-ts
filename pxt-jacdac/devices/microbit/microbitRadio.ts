namespace servers {
    // Service: bit:radio
    const SRV_BIT_RADIO = 0x1ac986cf
    const enum BitRadioReg {
        /**
         * Read-write bool (uint8_t). Turns on/off the radio antenna.
         *
         * ```
         * const [enabled] = jdunpack<[number]>(buf, "u8")
         * ```
         */
        Enabled = 0x1,

        /**
         * Read-write uint8_t. Group used to filter packets
         *
         * ```
         * const [group] = jdunpack<[number]>(buf, "u8")
         * ```
         */
        Group = 0x80,

        /**
         * Read-write uint8_t. Antenna power to increase or decrease range.
         *
         * ```
         * const [transmissionPower] = jdunpack<[number]>(buf, "u8")
         * ```
         */
        TransmissionPower = 0x81,

        /**
         * Read-write uint8_t. Change the transmission and reception band of the radio to the given channel.
         *
         * ```
         * const [frequencyBand] = jdunpack<[number]>(buf, "u8")
         * ```
         */
        FrequencyBand = 0x82,
    }

    const enum BitRadioCmd {
        /**
         * Argument: message string (bytes). Sends a string payload as a radio message, maximum 18 characters.
         *
         * ```
         * const [message] = jdunpack<[string]>(buf, "s")
         * ```
         */
        SendString = 0x80,

        /**
         * Argument: value f64 (uint64_t). Sends a double precision number payload as a radio message
         *
         * ```
         * const [value] = jdunpack<[number]>(buf, "f64")
         * ```
         */
        SendNumber = 0x81,

        /**
         * Sends a double precision number and a name payload as a radio message
         *
         * ```
         * const [value, name] = jdunpack<[number, string]>(buf, "f64 s")
         * ```
         */
        SendValue = 0x82,

        /**
         * Argument: data bytes. Sends a payload of bytes as a radio message
         *
         * ```
         * const [data] = jdunpack<[Buffer]>(buf, "b")
         * ```
         */
        SendBuffer = 0x83,

        /**
         * Raised when a string packet is received
         *
         * ```
         * const [time, deviceSerialNumber, rssi, message] = jdunpack<[number, number, number, string]>(buf, "u32 u32 i8 x[1] s")
         * ```
         */
        StringReceived = 0x90,

        /**
         * Raised when a number packet is received
         *
         * ```
         * const [time, deviceSerialNumber, rssi, value, name] = jdunpack<[number, number, number, number, string]>(buf, "u32 u32 i8 x[3] f64 s")
         * ```
         */
        NumberReceived = 0x91,

        /**
         * Raised when a buffer packet is received
         *
         * ```
         * const [time, deviceSerialNumber, rssi, data] = jdunpack<[number, number, number, Buffer]>(buf, "u32 u32 i8 x[1] b")
         * ```
         */
        BufferReceived = 0x92,
    }

    export class RadioServer extends jacdac.Server {
        readonly enabled = true;
        group = 1;
        transmissionPower = 6;

        constructor() {
            super("radio", SRV_BIT_RADIO)

            radio.setGroup(this.group)
            radio.setTransmitPower(this.transmissionPower);
            radio.onReceivedBuffer(buf => this.handleReceivedBuffer(buf))
            radio.onReceivedString(str => this.handleReceivedString(str))
            radio.onReceivedNumber(value => this.handleReceivedNumber("", value))
            radio.onReceivedValue((name, value) => this.handleReceivedNumber(name, value))
        }

        public handlePacket(pkt: jacdac.JDPacket) {
            super.handlePacket(pkt)

            // registers
            this.handleRegBool(pkt, BitRadioReg.Enabled, this.enabled);
            const oldGroup = this.group;
            this.group = this.handleRegValue(pkt, BitRadioReg.Group, "u8", this.group);
            if (oldGroup !== this.group)
                radio.setGroup(this.group)
            const oldTransmissionPower = this.transmissionPower
            this.transmissionPower = this.handleRegValue(pkt, BitRadioReg.TransmissionPower, "u8", this.transmissionPower);
            if (oldTransmissionPower !== this.transmissionPower)
                radio.setTransmitPower(this.transmissionPower)

            // commands
            switch(pkt.serviceCommand) {
                case BitRadioCmd.SendBuffer: this.handleSendBuffer(pkt); break;
                case BitRadioCmd.SendNumber: this.handleSendNumber(pkt); break;
                case BitRadioCmd.SendString: this.handleSendString(pkt); break;
                case BitRadioCmd.SendValue: this.handleSendValue(pkt); break;
            }
        }

        private handleReceivedBuffer(data: Buffer) {
            const deviceSerialNumber = radio.receivedSerial()
            const rssi = radio.receivedSignalStrength()
            const time = radio.receivedTime()

            const payload = jacdac.jdpack<[number, number, number, Buffer]>("u32 u32 i8 x[1] b", [time, deviceSerialNumber, rssi, data])
            this.sendReport(jacdac.JDPacket.from(BitRadioCmd.BufferReceived, payload))
        }

        private handleReceivedString(data: string) {
            const deviceSerialNumber = radio.receivedSerial()
            const rssi = radio.receivedSignalStrength()
            const time = radio.receivedTime()

            const payload = jacdac.jdpack<[number, number, number, string]>("u32 u32 i8 x[1] s", [time, deviceSerialNumber, rssi, data])
            this.sendReport(jacdac.JDPacket.from(BitRadioCmd.StringReceived, payload))
        }

        private handleReceivedNumber(name: string, data: number) {
            const deviceSerialNumber = radio.receivedSerial()
            const rssi = radio.receivedSignalStrength()
            const time = radio.receivedTime()

            const payload = jacdac.jdpack<[number, number, number, number, string]>("u32 u32 i8 x[3] f64 s", [time, deviceSerialNumber, rssi, data, name])
            this.sendReport(jacdac.JDPacket.from(BitRadioCmd.NumberReceived, payload))
        }

        private handleSendBuffer(pkt: jacdac.JDPacket) {
            const [data] = pkt.jdunpack<[Buffer]>("b");
            radio.sendBuffer(data)
        }
        private handleSendNumber(pkt: jacdac.JDPacket) {
            const [n] = pkt.jdunpack<[number]>("f64");
            radio.sendNumber(n)
        }
        private handleSendString(pkt: jacdac.JDPacket) {
            const [s] = pkt.jdunpack<[string]>("s");
            radio.sendString(s)
        }
        private handleSendValue(pkt: jacdac.JDPacket) {
            const [value, name] = pkt.jdunpack<[number, string]>("f64 s");
            radio.sendValue(name, value)
        }
    }

    //% fixedInstance whenUsed block="radio"
    export const radioServer = new RadioServer()
}