namespace microbit {
    const SRV_BUTTON = 0x1473a263
    export class MButton extends jacdac.SensorServer {
        constructor(dev: string, private button: Button) {
            super(dev, SRV_BUTTON);
            control.onEvent(button, EventBusValue.MICROBIT_EVT_ANY, 
            () => {    
                let v = control.eventValue();    
                if (v == EventBusValue.MICROBIT_BUTTON_EVT_DOWN)
                    this.sendEvent(0x1);
                else if (v == EventBusValue.MICROBIT_BUTTON_EVT_UP)
                    this.sendEvent(0x2);
            })
        }
        public serializeState(): Buffer {
            let pressed = input.buttonIsPressed(this.button);
            return jacdac.jdpack("u8", [ pressed ? 1 : 0]);
        }
    }
}