import React, { createElement, FunctionComponent, useMemo } from "react";
import {
    SRV_ACCELEROMETER, SRV_ANALOG_BUTTON, SRV_ARCADE_GAMEPAD, SRV_BUTTON, SRV_BUZZER, SRV_CHARACTER_SCREEN,
    SRV_COLOR,
    SRV_JOYSTICK,
    SRV_LED,
    SRV_LEDMATRIX,
    SRV_LED_PIXEL, SRV_MATRIX_KEYPAD, SRV_MOTION, SRV_POWER, SRV_RAIN_GAUGE,
    SRV_REAL_TIME_CLOCK, SRV_REFLECTED_LIGHT, SRV_RNG, SRV_ROLE_MANAGER,
    SRV_ROTARY_ENCODER, SRV_SERVO, SRV_SEVEN_SEGMENT_DISPLAY, SRV_SOIL_MOISTURE,
    SRV_SOUND_LEVEL,
    SRV_SOUND_PLAYER, SRV_SPEECH_SYNTHESIS, SRV_SWITCH, SRV_TRAFFIC_LIGHT, SRV_WATER_LEVEL,
    SRV_WIND_DIRECTION, SystemReg,
} from "../../../../src/jdom/constants";
import { JDService } from "../../../../src/jdom/service";
import DashboardAccelerometer from "./DashboardAccelerometer";
import DashboardBuzzer from "./DashboardBuzzer";
import DashboardLEDPixel from "./DashboardLEDPixel";
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
import DashboardLEDMatrix from "./DashboardLEDMatrix";
import DashboardArcadeGamepad from "./DashboardArcadeGamepad";
import DashboardWindDirection from "./DashboardWindDirection";
import DashboardMatrixKeypad from "./DashboardMatrixKeypad";
import DashboardReflectedLight from "./DashboardReflectedLight";
import DashboardPower from "./DashboardPower";
import DashboardSpeechSynthesis from "./DashboardSpeechSynthesis";
import DashboardSoilMoisture from "./DashboardSoilMoisture";
import DashboardRealTimeClock from "./DashboardRealTimeClock";
import DashboardLED from "./DashboardLED";
import DashboardJoystick from "./DashboardJoystick";
import DashboardSevenSegmentDisplay from "./DashboardSevenSegmentDisplay";
import DashboardMotion from "./DashboardMotion";
import DashbaordWaterLevel from "./DashboardWaterLevel";
import DashboardColor from "./DashboardColor";
import DashboardSoundPlayer from "./DashboardSoundPlayer";
import DashboardAnalogButton from "./DashboardAnalogButton";
import DashboardSoundLevel from "./DashboardSoundLevel";
import DashboardRandomNumberGenerator from "./DashboardRandomNumberGenerator";

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
    [SRV_LED_PIXEL]: DashboardLEDPixel,
    [SRV_ACCELEROMETER]: DashboardAccelerometer,
    [SRV_ROTARY_ENCODER]: DashboardRotaryEncoder,
    [SRV_BUTTON]: DashboardButton,
    [SRV_SERVO]: DashboardServo,
    [SRV_SWITCH]: DashboardSwitch,
    [SRV_TRAFFIC_LIGHT]: DashboardTrafficLight,
    [SRV_CHARACTER_SCREEN]: DashboardCharacterScreen,
    [SRV_RAIN_GAUGE]: DashbaordRainGauge,
    [SRV_LEDMATRIX]: DashboardLEDMatrix,
    [SRV_ARCADE_GAMEPAD]: DashboardArcadeGamepad,
    [SRV_WIND_DIRECTION]: DashboardWindDirection,
    [SRV_MATRIX_KEYPAD]: DashboardMatrixKeypad,
    [SRV_REFLECTED_LIGHT]: DashboardReflectedLight,
    [SRV_POWER]: DashboardPower,
    [SRV_SPEECH_SYNTHESIS]: DashboardSpeechSynthesis,
    [SRV_SOIL_MOISTURE]: DashboardSoilMoisture,
    [SRV_REAL_TIME_CLOCK]: DashboardRealTimeClock,
    [SRV_LED]: DashboardLED,
    [SRV_JOYSTICK]: DashboardJoystick,
    [SRV_SEVEN_SEGMENT_DISPLAY]: DashboardSevenSegmentDisplay,
    [SRV_MOTION]: DashboardMotion,
    [SRV_WATER_LEVEL]: DashbaordWaterLevel,
    [SRV_COLOR]: DashboardColor,
    [SRV_SOUND_PLAYER]: DashboardSoundPlayer,
    [SRV_ANALOG_BUTTON]: DashboardAnalogButton,
    [SRV_SOUND_LEVEL]: DashboardSoundLevel,
    [SRV_RNG]: DashboardRandomNumberGenerator,
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
    const [intensity] = useRegisterUnpackedValue<[boolean]>(intensityRegister);
    const hasIntensity = intensity !== undefined;
    const off = hasIntensity ? !intensity : undefined;
    const toggleOff = async () => {
        await intensityRegister.sendSetBoolAsync(off, true);
    }

    return <RegisterInput
        register={valueRegister}
        variant={"widget"}
        showServiceName={false}
        showRegisterName={false}
        hideMissingValues={true}
        off={off}
        toggleOff={hasIntensity ? toggleOff : undefined}
    />;
}

function IntensityWidget(props: { intensityRegister: JDRegister }) {
    const { intensityRegister } = props;
    const [intensity] = useRegisterUnpackedValue<[number | boolean]>(intensityRegister);
    const off = intensity !== undefined && !intensity;

    return <RegisterInput
        register={intensityRegister}
        variant={"widget"}
        showServiceName={false}
        showRegisterName={false}
        hideMissingValues={true}
        off={off}
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
        hideMissingValues={true}
    />;
}

export default function DashboardServiceWidget(props: React.Attributes & DashboardServiceProps): JSX.Element {
    const { service } = props;
    const { specification } = service;
    const component: DashboardServiceComponent = serviceViews[specification.classIdentifier] || DefaultWidget;
    return createElement(component, props);
}
