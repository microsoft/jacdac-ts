import React, { createElement, FunctionComponent, useMemo } from "react";
import {
    SRV_ACCELEROMETER, SRV_ARCADE_GAMEPAD, SRV_BUTTON, SRV_BUZZER, SRV_CHARACTER_SCREEN,
    SRV_LED_MATRIX_DISPLAY, SRV_LED_PIXEL, SRV_MATRIX_KEYPAD, SRV_RAIN_GAUGE, SRV_ROLE_MANAGER,
    SRV_ROTARY_ENCODER, SRV_SERVO, SRV_SWITCH, SRV_TRAFFIC_LIGHT, SRV_WIND_DIRECTION, SystemReg
} from "../../../../src/jdom/constants";
import { JDService } from "../../../../src/jdom/service";
import DashboardAccelerometer from "./DashboardAccelerometer";
import DashboardBuzzer from "./DashboardBuzzer";
import DashboardLedPixel from "./DashboardLedPixel";
import DashboardRoleManager from "./DashboardRoleManager";
import DashboardRotaryEncoder from "./DashboardRotaryEncoder";
import DashboardButton from "./DashboardButton";
import { isRegister } from "../../../../src/jdom/spec";
import RegisterInput from "../RegisterInput";
import DashboardServo from "./DashboardServo";
import { JDRegister } from "../../../../src/jdom/register";
import { useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import DashboardSwitch from "./DashboardSwitch";
import DashboardTrafficLight from "./DashboardTrafficLight";
import DashboardCharacterScreen from "./DashboardCharacterScreen";
import DashbaordRainGauge from "./DashboardRainGauge";
import DashboardLEDMatrixDisplay from "./DashboardLEDMatrixDisplay";
import DashboardArcadeGamepad from "./DashboardArcadeGamepad";
import DashboardWindDirection from "./DashboardWindDirection";
import DashboardMatrixKeypad from "./DashboardMatrixKeypad";

export interface DashboardServiceProps {
    service: JDService,
    expanded?: boolean,
    // all widget services
    services?: JDService[],
    variant?: "icon" | ""
}
export type DashboardServiceComponent = FunctionComponent<DashboardServiceProps>;

const serviceViews: { [serviceClass: number]: DashboardServiceComponent } = {
    [SRV_ROLE_MANAGER]: DashboardRoleManager,
    [SRV_BUZZER]: DashboardBuzzer,
    [SRV_LED_PIXEL]: DashboardLedPixel,
    [SRV_ACCELEROMETER]: DashboardAccelerometer,
    [SRV_ROTARY_ENCODER]: DashboardRotaryEncoder,
    [SRV_BUTTON]: DashboardButton,
    [SRV_SERVO]: DashboardServo,
    [SRV_SWITCH]: DashboardSwitch,
    [SRV_TRAFFIC_LIGHT]: DashboardTrafficLight,
    [SRV_CHARACTER_SCREEN]: DashboardCharacterScreen,
    [SRV_RAIN_GAUGE]: DashbaordRainGauge,
    [SRV_LED_MATRIX_DISPLAY]: DashboardLEDMatrixDisplay,
    [SRV_ARCADE_GAMEPAD]: DashboardArcadeGamepad,
    [SRV_WIND_DIRECTION]: DashboardWindDirection,
    [SRV_MATRIX_KEYPAD]: DashboardMatrixKeypad,
}

export function addServiceComponent(serviceClass: number, component: DashboardServiceComponent) {
    serviceViews[serviceClass] = component;
}

const collapsedRegisters = [
    SystemReg.Reading,
    SystemReg.Value,
    SystemReg.Intensity
]

function ValueWidget(props: { valueRegister: JDRegister, intensityRegister: JDRegister }) {
    const { valueRegister, intensityRegister } = props;
    const [intensity] = useRegisterUnpackedValue<[number | boolean]>(intensityRegister);
    const off = intensity !== undefined && !intensity;

    return <RegisterInput
        register={valueRegister}
        variant={off ? "offwidget" : "widget"}
        showServiceName={false}
        showRegisterName={false}
        hideMissingValues={false}
    />;
}

function IntensityWidget(props: { intensityRegister: JDRegister }) {
    const { intensityRegister } = props;
    const [intensity] = useRegisterUnpackedValue<[number | boolean]>(intensityRegister);
    const off = intensity !== undefined && !intensity;

    return <RegisterInput
        register={intensityRegister}
        variant={off ? "offwidget" : "widget"}
        showServiceName={false}
        showRegisterName={false}
        hideMissingValues={true}
    />;
}

function DefaultWidget(props: DashboardServiceProps) {
    const { service } = props;
    const { specification } = service;
    const register = useMemo(() => {
        const rspec = specification?.packets
            .find(pkt => isRegister(pkt) && collapsedRegisters.indexOf(pkt.identifier) > -1);
        return service.register(rspec?.identifier);
    }, [service])

    if (!register) // nothing to see here
        return null;

    // if register is value, disable if enabled is 0.
    if (register.specification.identifier == SystemReg.Value) {
        const intensityRegister = register.service.register(SystemReg.Intensity);
        if (intensityRegister)
            return <ValueWidget valueRegister={register} intensityRegister={intensityRegister} />;
    }

    // case of no streaming,value just intensity, like a relay
    if (register.specification.identifier === SystemReg.Intensity)
        return <IntensityWidget intensityRegister={register} />

    return <RegisterInput
        register={register}
        variant={"widget"}
        showServiceName={false}
        showRegisterName={false}
        hideMissingValues={false}
    />;
}

export default function DashboardServiceWidget(props: React.Attributes & DashboardServiceProps): JSX.Element {
    const { service } = props;
    const { specification } = service;
    const component: DashboardServiceComponent = serviceViews[specification.classIdentifier] || DefaultWidget;
    return createElement(component, props);
}
