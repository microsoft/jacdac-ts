import {
    CharacterScreenTextDirection,
    CharacterScreenVariant,
    DistanceVariant, LightVariant, PotentiometerVariant, RelayReg, RelayVariant, ServoVariant,
    SRV_ACCELEROMETER, SRV_BAROMETER, SRV_DISTANCE, SRV_POTENTIOMETER, SRV_RELAY,
    SRV_SERVO, SRV_THERMOMETER, SRV_TRAFFIC_LIGHT,
    SRV_VIBRATION_MOTOR, SwitchVariant, ThermometerVariant
} from "../jdom/constants";
import ProtocolTestServiceHost from "../jdom/protocoltestservicehost";
import JDServiceHost from "../jdom/servicehost";
import ButtonServiceHost from "./buttonservicehost";
import BuzzerServiceHost from "./buzzerservicehost";
import CharacterScreenServiceHost from "./characterscreenservicehost";
import HumidityServiceHost from "./humidityservicehost";
import LEDMatrixDisplayServiceHost from "./ledmatrixdisplayservicehost";
import LightServiceHost from "./lightservicehost";
import MotorServiceHost from "./motorservicehost";
import RainGaugeServiceHost from "./raingaugeservicehost";
import RotaryEncoderServiceHost from "./rotaryencoderservicehost";
import JDSensorServiceHost from "./sensorservicehost";
import ServoServiceHost from "./servoservicehost";
import SettingsServiceHost from "./settingsservicehost";
import SwitchServiceHost from "./switchservicehost";
import TrafficLightServiceHost from "./trafficlightservicehost";

const outdoorThermometerOptions = {
    readingValue: 21.5,
    streamingInterval: 1000,
    minReading: -40,
    maxReading: 120,
    readingError: 0.25,
    variant: ThermometerVariant.Outdoor
}
const medicalThermometerOptions = {
    readingValue: 37.5,
    streamingInterval: 1000,
    minReading: 35,
    maxReading: 42,
    readingError: 0.5,
    variant: ThermometerVariant.Body
}
const barometerOptions = {
    readingValue: 1013
}
const sonarOptions = {
    variant: DistanceVariant.Ultrasonic,
    minReading: 0.02,
    maxReading: 4,
    readingValue: 1
};

const SG90_STALL_TORQUE = 1.8;
export const SG90_RESPONSE_SPEED = 0.12; // deg/60deg

const microServoOptions = {
    stallTorque: SG90_STALL_TORQUE, // kg/cm
    responseSpeed: SG90_RESPONSE_SPEED, // s/60deg
    variant: ServoVariant.PositionalRotation
}
const microServo270Options = {
    stallTorque: SG90_STALL_TORQUE, // kg/cm
    responseSpeed: SG90_RESPONSE_SPEED, // s/60deg
    variant: ServoVariant.PositionalRotation,
    minAngle: -135,
    maxAngle: 135
}
const microServo360Options = {
    stallTorque: SG90_STALL_TORQUE, // kg/cm
    responseSpeed: SG90_RESPONSE_SPEED * 2, // s/60deg
    variant: ServoVariant.PositionalRotation,
    minAngle: -180,
    maxAngle: 180
}

const _hosts = [
    {
        name: "accelerometer",
        services: () => [new JDSensorServiceHost<[number, number, number]>(SRV_ACCELEROMETER, {
            readingValue: [0.5, 0.5, -(1 - (0.5 * 0.5 + 0.5 * 0.5))]
        })]
    },
    {
        name: "barometer",
        services: () => [new JDSensorServiceHost<number>(SRV_BAROMETER, barometerOptions)]
    },
    {
        name: "button",
        services: () => [new ButtonServiceHost()]
    },
    {
        name: "buzzer",
        services: () => [new BuzzerServiceHost()]
    },
    {
        name: "character screen (LDC, 16x2)",
        services: () => [new CharacterScreenServiceHost({ message: "hello\nworld!" })]
    },
    {
        name: "character screen (OLED, 32x8, RTL)",
        services: () => [new CharacterScreenServiceHost({
            message: "hello\nworld!",
            columns: 32,
            rows: 8,
            variant: CharacterScreenVariant.OLED,
            textDirection: CharacterScreenTextDirection.RightToLeft
        })]
    },
    {
        name: "chassis (motor x 2 + sonar + light)",
        services: () => [
            new MotorServiceHost(),
            new MotorServiceHost(),
            new JDSensorServiceHost(SRV_DISTANCE, sonarOptions),
            new LightServiceHost({ numPixels: 5, variant: LightVariant.Stick })
        ]
    },
    {
        name: "distance (sonar)",
        services: () => [new JDSensorServiceHost(SRV_DISTANCE, sonarOptions)]
    },
    {
        name: "humidity + temperature",
        services: () => [new HumidityServiceHost(), new JDSensorServiceHost(SRV_THERMOMETER, outdoorThermometerOptions)]
    },
    {
        name: "humidity + temperature + barometer",
        services: () => [
            new HumidityServiceHost(),
            new JDSensorServiceHost(SRV_THERMOMETER, outdoorThermometerOptions),
            new JDSensorServiceHost(SRV_BAROMETER, barometerOptions)]
    },
    {
        name: "led matrix (5x5 micro:bit)",
        services: () => [new LEDMatrixDisplayServiceHost(5, 5)]
    },
    {
        name: "led matrix (8x8)",
        services: () => [new LEDMatrixDisplayServiceHost(8, 8)]
    },
    {
        name: "led matrix (11x7)",
        services: () => [new LEDMatrixDisplayServiceHost(11, 7)]
    },
    {
        name: "light ring 10",
        services: () => [new LightServiceHost({ numPixels: 10, variant: LightVariant.Ring })]
    },
    {
        name: "light ring 24",
        services: () => [new LightServiceHost({ numPixels: 24, variant: LightVariant.Ring })]
    },
    {
        name: "light stick 8",
        services: () => [new LightServiceHost({ numPixels: 8, variant: LightVariant.Stick })]
    },
    {
        name: "light strip 30",
        services: () => [new LightServiceHost({ numPixels: 60, maxPower: 1000, variant: LightVariant.Strip })]
    },
    {
        name: "light strip 60",
        services: () => [new LightServiceHost({ numPixels: 60, maxPower: 2000, variant: LightVariant.Strip })]
    },
    {
        name: "light strip 150",
        services: () => [new LightServiceHost({ numPixels: 150, maxPower: 5000, variant: LightVariant.Strip })]
    },
    {
        name: "light strip 300",
        services: () => [new LightServiceHost({ numPixels: 300, maxPower: 5000, variant: LightVariant.Strip })]
    },
    {
        name: "motor",
        services: () => [new MotorServiceHost()]
    },
    {
        name: "protocol test",
        services: () => [new ProtocolTestServiceHost()]
    },
    {
        name: "rain gauge",
        services: () => [new RainGaugeServiceHost()]
    },
    {
        name: "relay (EM/10A)",
        services: () => [new JDServiceHost(SRV_RELAY, {
            intensityValues: [false],
            variant: RelayVariant.Electromechanical,
            registerValues: [
                {
                    code: RelayReg.MaxSwitchingCurrent,
                    values: [10]
                }
            ]
        })]
    },
    {
        name: "relay 4x (SSR/5A)",
        services: () => Array(4).fill(0).map(_ => new JDServiceHost(SRV_RELAY, {
            intensityValues: [false],
            variant: RelayVariant.SolidState,
            registerValues: [
                {
                    code: RelayReg.MaxSwitchingCurrent,
                    values: [5]
                }
            ]
        }))
    },
    {
        name: "rotary encoder",
        services: () => [new RotaryEncoderServiceHost()]
    },
    {
        name: "rotary encoder + button",
        services: () => [new RotaryEncoderServiceHost(), new ButtonServiceHost()]
    },
    {
        name: "rotary potentiometer",
        services: () => [new JDSensorServiceHost(SRV_POTENTIOMETER, { variant: PotentiometerVariant.Rotary })]
    },
    {
        name: "servo",
        services: () => [new ServoServiceHost(microServoOptions)]
    },
    {
        name: "servo (270°)",
        services: () => [new ServoServiceHost(microServo270Options)]
    },
    {
        name: "servo (360°)",
        services: () => [new ServoServiceHost(microServo360Options)]
    },
    {
        name: "servo x 2",
        services: () => Array(2).fill(0).map((_, i) => new ServoServiceHost(microServoOptions))
    },
    {
        name: "servo x 4",
        services: () => Array(4).fill(0).map((_, i) => new ServoServiceHost(microServoOptions))
    },
    {
        name: "servo x 6",
        services: () => Array(6).fill(0).map((_, i) => new ServoServiceHost(microServoOptions))
    },
    {
        name: "servo x 16",
        services: () => Array(16).fill(0).map((_, i) => new ServoServiceHost(microServoOptions))
    },
    {
        name: "settings",
        services: () => [new SettingsServiceHost()]
    },
    {
        name: "slider",
        services: () => [new JDSensorServiceHost(SRV_POTENTIOMETER, { variant: PotentiometerVariant.Slider })]
    },
    {
        name: "switch (slide)",
        services: () => [new SwitchServiceHost({ variant: SwitchVariant.Slide })]
    },
    {
        name: "switch (push button)",
        services: () => [new SwitchServiceHost({ variant: SwitchVariant.PushButton })]
    },
    {
        name: "switch (toggle)",
        services: () => [new SwitchServiceHost({ variant: SwitchVariant.Toggle })]
    },
    {
        name: "switch (tilt)",
        services: () => [new SwitchServiceHost({ variant: SwitchVariant.Tilt })]
    },
    {
        name: "switch (motion)",
        services: () => [new SwitchServiceHost({ variant: SwitchVariant.Light, autoOffDelay: 30 })]
    },
    {
        name: "thermometer (outdoor)",
        services: () => [new JDSensorServiceHost(SRV_THERMOMETER, outdoorThermometerOptions)]
    },
    {
        name: "thermometer (medical)",
        services: () => [new JDSensorServiceHost(SRV_THERMOMETER, medicalThermometerOptions)]
    },
    {
        name: "traffic light",
        services: () => [new TrafficLightServiceHost()]
    },
    {
        name: "thermocouple",
        services: () => [new JDSensorServiceHost(SRV_THERMOMETER, {
            readingValue: 550,
            streamingInterval: 1000,
            minReading: 0,
            maxReading: 1100,
            readingError: 2.2,
            variant: ThermometerVariant.Thermocouple
        })]
    },
    {
        name: "vibration motor",
        services: () => [new JDServiceHost(SRV_VIBRATION_MOTOR)]
    }
];

export default function hosts() {
    return _hosts.slice(0);
}