import React, { createElement, FunctionComponent, lazy, useMemo, Suspense } from "react";
import {
    SRV_ACCELEROMETER, SRV_ANALOG_BUTTON, SRV_ARCADE_GAMEPAD, SRV_BUTTON, SRV_BUZZER, SRV_CHARACTER_SCREEN,
    SRV_COLOR,
    SRV_COMPASS,
    SRV_GYROSCOPE,
    SRV_JOYSTICK,
    SRV_LED,
    SRV_LED_MATRIX,
    SRV_LED_PIXEL, SRV_MATRIX_KEYPAD, SRV_MOTION, SRV_POWER, SRV_RAIN_GAUGE,
    SRV_REAL_TIME_CLOCK, SRV_REFLECTED_LIGHT, SRV_RNG, SRV_ROLE_MANAGER,
    SRV_ROTARY_ENCODER, SRV_SERVO, SRV_SEVEN_SEGMENT_DISPLAY, SRV_SOIL_MOISTURE,
    SRV_SOUND_LEVEL,
    SRV_SOUND_PLAYER, SRV_SPEECH_SYNTHESIS, SRV_SWITCH, SRV_TRAFFIC_LIGHT, SRV_WATER_LEVEL,
    SRV_WIND_DIRECTION, SystemReg,
} from "../../../../src/jdom/constants";
import { JDService } from "../../../../src/jdom/service";
import { isRegister } from "../../../../src/jdom/spec";
import RegisterInput from "../RegisterInput";
import { JDRegister } from "../../../../src/jdom/register";
import { useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import { NoSsr } from '@material-ui/core';

const DashboardButton = lazy(() => import("./DashboardButton"));
const DashboardAccelerometer = lazy(() => import("./DashboardAccelerometer"));
const DashboardBuzzer = lazy(() => import("./DashboardBuzzer"));
const DashboardLEDPixel = lazy(() => import("./DashboardLEDPixel"));
const DashboardRoleManager = lazy(() => import("./DashboardRoleManager"));
const DashboardRotaryEncoder = lazy(() => import("./DashboardRotaryEncoder"));
const DashboardServo = lazy(() => import("./DashboardServo"));
const DashboardSwitch = lazy(() => import("./DashboardSwitch"));
const DashboardTrafficLight = lazy(() => import("./DashboardTrafficLight"));
const DashboardCharacterScreen = lazy(() => import("./DashboardCharacterScreen"));
const DashboardRainGauge = lazy(() => import("./DashboardRainGauge"));
const DashboardLEDMatrix = lazy(() => import("./DashboardLEDMatrix"));
const DashboardArcadeGamepad = lazy(() => import("./DashboardArcadeGamepad"));
const DashboardWindDirection = lazy(() => import("./DashboardWindDirection"));
const DashboardMatrixKeypad = lazy(() => import("./DashboardMatrixKeypad"));
const DashboardReflectedLight = lazy(() => import("./DashboardReflectedLight"));
const DashboardPower = lazy(() => import("./DashboardPower"));
const DashboardSpeechSynthesis = lazy(() => import("./DashboardSpeechSynthesis"));
const DashboardSoilMoisture = lazy(() => import("./DashboardSoilMoisture"));
const DashboardRealTimeClock = lazy(() => import("./DashboardRealTimeClock"));
const DashboardLED = lazy(() => import("./DashboardLED"));
const DashboardJoystick = lazy(() => import("./DashboardJoystick"));
const DashboardSevenSegmentDisplay = lazy(() => import("./DashboardSevenSegmentDisplay"));
const DashboardMotion = lazy(() => import("./DashboardMotion"));
const DashboardWaterLevel = lazy(() => import("./DashboardWaterLevel"));
const DashboardColor = lazy(() => import("./DashboardColor"));
const DashboardSoundPlayer = lazy(() => import("./DashboardSoundPlayer"));
const DashboardAnalogButton = lazy(() => import("./DashboardAnalogButton"));
const DashboardSoundLevel = lazy(() => import("./DashboardSoundLevel"));
const DashboardRandomNumberGenerator = lazy(() => import("./DashboardRandomNumberGenerator"));
const DashboardCompass = lazy(() => import("./DashboardCompass"));
const DashboardGyroscope = lazy(() => import("./DashboardGyroscope"));

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
        component: DashboardRainGauge,
    },
    [SRV_LED_MATRIX]: {
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
        component: DashboardWaterLevel,
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
    const component = serviceViews[specification.classIdentifier]?.component;
    // no special support
    if (!component)
        return createElement(DefaultWidget, props);;

    return <NoSsr>
        <Suspense fallback={null}>
            {createElement(component, props)}
        </Suspense>
    </NoSsr>
}


export function dashboardServiceWeight(service: JDService) {
    const view = serviceViews[service.serviceClass];
    return view?.weight?.(service);
}