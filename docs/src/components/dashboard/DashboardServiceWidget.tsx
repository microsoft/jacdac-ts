import React, { createElement, FunctionComponent, useMemo } from "react";
import {
    SRV_ACCELEROMETER, SRV_ANALOG_BUTTON, SRV_ARCADE_GAMEPAD, SRV_BUTTON, SRV_BUZZER, SRV_CHARACTER_SCREEN,
    SRV_COLOR,
    SRV_COMPASS,
    SRV_GYROSCOPE,
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
import DashboardCompass from "./DashboardCompass";
import DashboardGyroscope from "./DashboardGyroscope";

export interface DashboardServiceProps {
    service: JDService,
    expanded?: boolean,
    // all widget services
    services?: JDService[],
    variant?: "icon" | ""
}
export type DashboardServiceComponent = FunctionComponent<DashboardServiceProps>;

const serviceViews: {
    [serviceClass: number]: {
        component: DashboardServiceComponent;
        weight?: (service: JDService) => number;
    }
} = {
    [SRV_ROLE_MANAGER]: {
        component: DashboardRoleManager,
    },
    [SRV_BUZZER]: {
        component: DashboardBuzzer,
        weight: () => 2
    },
    [SRV_LED_PIXEL]: {
        component: DashboardLEDPixel,
    },
    [SRV_ACCELEROMETER]: {
        component: DashboardAccelerometer,
        weight: () => 2,
    },
    [SRV_ROTARY_ENCODER]: {
        component: DashboardRotaryEncoder,
    },
    [SRV_BUTTON]: {
        component: DashboardButton,
    },
    [SRV_SERVO]: {
        component: DashboardServo,
    },
    [SRV_SWITCH]: {
        component: DashboardSwitch,
    },
    [SRV_TRAFFIC_LIGHT]: {
        component: DashboardTrafficLight,
    },
    [SRV_CHARACTER_SCREEN]: {
        component: DashboardCharacterScreen,
        weight: (srv) => 3
    },
    [SRV_RAIN_GAUGE]: {
        component: DashbaordRainGauge,
    },
    [SRV_LEDMATRIX]: {
        component: DashboardLEDMatrix,
        weight: (srv) => 3
    },
    [SRV_ARCADE_GAMEPAD]: {
        component: DashboardArcadeGamepad,
        weight: (srv) => 3
    },
    [SRV_WIND_DIRECTION]: {
        component: DashboardWindDirection,
    },
    [SRV_MATRIX_KEYPAD]: {
        component: DashboardMatrixKeypad,
    },
    [SRV_REFLECTED_LIGHT]: {
        component: DashboardReflectedLight,
    },
    [SRV_POWER]: {
        component: DashboardPower,
    },
    [SRV_SPEECH_SYNTHESIS]: {
        component: DashboardSpeechSynthesis,
    },
    [SRV_SOIL_MOISTURE]: {
        component: DashboardSoilMoisture,
    },
    [SRV_REAL_TIME_CLOCK]: {
        component: DashboardRealTimeClock,
    },
    [SRV_LED]: {
        component: DashboardLED,
    },
    [SRV_JOYSTICK]: {
        component: DashboardJoystick,
    },
    [SRV_SEVEN_SEGMENT_DISPLAY]: {
        component: DashboardSevenSegmentDisplay,
    },
    [SRV_MOTION]: {
        component: DashboardMotion,
    },
    [SRV_WATER_LEVEL]: {
        component: DashbaordWaterLevel,
    },
    [SRV_COLOR]: {
        component: DashboardColor,
    },
    [SRV_SOUND_PLAYER]: {
        component: DashboardSoundPlayer,
        weight: (srv) => 2
    },
    [SRV_ANALOG_BUTTON]: {
        component: DashboardAnalogButton,
    },
    [SRV_SOUND_LEVEL]: {
        component: DashboardSoundLevel,
    },
    [SRV_RNG]: {
        component: DashboardRandomNumberGenerator,
    },
    [SRV_COMPASS]: {
        component: DashboardCompass,
    },
    [SRV_GYROSCOPE]: {
        component: DashboardGyroscope,
        weight: () => 2,
    }
}

export function addServiceComponent(serviceClass: number, component: DashboardServiceComponent) {
    serviceViews[serviceClass] = { component };
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
    const component = serviceViews[specification.classIdentifier]?.component || DefaultWidget;
    return createElement(component, props);
}


export function dashboardServiceWeight(service: JDService) {
    const view = serviceViews[service.serviceClass];
    return view?.weight?.(service);
}