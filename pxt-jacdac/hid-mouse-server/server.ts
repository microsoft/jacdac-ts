namespace jacdac {
    export class HIDMouseServer extends jacdac.SensorServer {
        constructor(dev: string) {
            super(dev, jacdac.SRV_HID_MOUSE);
        }
    }
}
