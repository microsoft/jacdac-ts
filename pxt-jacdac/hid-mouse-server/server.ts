namespace servers {
    export class HIDMouseServer extends jacdac.SensorServer {
        constructor(dev: string) {
            super(dev, jacdac.SRV_HID_MOUSE)
        }

        handlePacket(packet: jacdac.JDPacket) {
            switch (packet.serviceCommand) {
                case jacdac.HidMouseCmd.SetButton:
                    this.handleSetButton(packet)
                    break
                case jacdac.HidMouseCmd.Move:
                    this.handleMove(packet)
                    break
                case jacdac.HidMouseCmd.Wheel:
                    this.handleWheel(packet)
                    break
            }
        }

        private handleSetButton(pkt: jacdac.JDPacket) {
            const [buttons, event] = pkt.jdunpack<
                [MouseButton, jacdac.HidMouseButtonEvent]
            >("u16 u8")
            switch (event) {
                case jacdac.HidMouseButtonEvent.Down:
                    mouse.setButton(buttons, true)
                    break
                case jacdac.HidMouseButtonEvent.Up:
                    mouse.setButton(buttons, false)
                    break
                case jacdac.HidMouseButtonEvent.Click:
                    mouse.setButton(buttons, true)
                    pause(200)
                    mouse.setButton(buttons, false)
                    break
                case jacdac.HidMouseButtonEvent.Click:
                    mouse.setButton(buttons, true)
                    pause(100)
                    mouse.setButton(buttons, false)
                    pause(100)
                    mouse.setButton(buttons, true)
                    pause(100)
                    mouse.setButton(buttons, false)
                    break
            }
        }

        private handleMove(pkt: jacdac.JDPacket) {
            const [dx, dy, time] = pkt.jdunpack<[number, number, number]>(
                "i16 i16 u16"
            )
            mouse.move(dx, dy)
        }

        private handleWheel(pkt: jacdac.JDPacket) {
            const [dy, time] = pkt.jdunpack<[number, number, number]>("i16 u16")
            mouse.turnWheel(dy)
        }
    }

    //% fixedInstance whenUsed
    export const hidMouseServer = new HIDMouseServer("mouse")
}
