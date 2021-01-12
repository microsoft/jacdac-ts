import { Grid } from "@material-ui/core";
import React from "react";
import { ButtonEvent, ButtonReg, SRV_BUTTON, SystemReg } from "../../../../src/jdom/constants";
import { DashboardServiceProps } from "./DashboardServiceView";
import ButtonWidget from "../widgets/ButtonWidget";
import { useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import useWidgetSize from "../widgets/useWidgetSize";
import JDSensorServiceHost from "../../../../src/jdom/sensorservicehost";
import useServiceHost from "../hooks/useServiceHost";
import { delay } from "../../../../src/jdom/utils";

class ButtonServiceHost extends JDSensorServiceHost {
    constructor() {
        super(SRV_BUTTON, "u8", [false], 50);
    }

    async down() {
        const [v] = this.reading.values<[number]>();
        if (!v) {
            this.reading.setValues([true]);
            await this.sendEvent(ButtonEvent.Down);
        }
    }

    async up() {
        const [v] = this.reading.values<[number]>();
        if (v) {
            this.reading.setValues([false]);
            await this.sendEvent(ButtonEvent.Up);
        }
    }

    async click() {
        this.down(); // async event
        await delay(100);
        this.up(); // async event
        this.sendEvent(ButtonEvent.Click);
    }

    async longClick() {
        this.down(); // async event
        await delay(500);
        this.up(); // async event
        this.sendEvent(ButtonEvent.LongClick);
    }
}

export default function DashboardButton(props: DashboardServiceProps) {
    const { service } = props;
    const pressedRegister = service.register(ButtonReg.Pressed);
    const [pressed] = useRegisterUnpackedValue<[boolean]>(pressedRegister);
    const widgetSize = useWidgetSize();
    const host = useServiceHost<ButtonServiceHost>(service);
    const handleClick = () => host?.click();

    return <Grid item>
        <ButtonWidget checked={!!pressed} color={"primary"} size={widgetSize} onClick={host && handleClick} />
    </Grid>
}