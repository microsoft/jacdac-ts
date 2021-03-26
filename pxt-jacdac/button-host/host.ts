import JDButtonEvent = jacdac.ButtonEvent
import MkcdButtonEvent = ButtonEvent

namespace jacdac {
    export class ButtonHost extends jacdac.SensorHost {
        constructor(dev: string, public readonly button: Button) {
            super(dev, jacdac.SRV_BUTTON);
            this.button.onEvent(MkcdButtonEvent.Down, () => this.sendEvent(JDButtonEvent.Down));
            this.button.onEvent(MkcdButtonEvent.Up, () => this.sendEvent(JDButtonEvent.Up));
            this.button.onEvent(MkcdButtonEvent.Click, () => this.sendEvent(JDButtonEvent.Click));
            this.button.onEvent(<number>DAL.DEVICE_BUTTON_EVT_HOLD, () => this.sendEvent(JDButtonEvent.Hold));
        }

        serializeState(): Buffer {
            const pressed = this.button.isPressed();
            return jacdac.jdpack("u8", [ pressed ? 1 : 0]);
        }
    }
}
