import { LightVariant, PotentiometerVariant, SRV_ACCELEROMETER, SRV_BAROMETER, SRV_POTENTIOMETER, SRV_SERVO, SRV_THERMOMETER, SRV_VIBRATION_MOTOR, ThermometerVariant } from "../jdom/constants";
import ProtocolTestServiceHost from "../jdom/protocoltestservicehost";
import JDServiceHost from "../jdom/servicehost";
import ButtonServiceHost from "./buttonservicehost";
import BuzzerServiceHost from "./buzzerservicehost";
import HumidityServiceHost from "./humidityservicehost";
import LightServiceHost from "./lightservicehost";
import MotorServiceHost from "./motorservicehost";
import RotaryEncoderServiceHost from "./rotaryencoderservicehost";
import JDSensorServiceHost from "./sensorservicehost";
import ServoServiceHost from "./servoservicehost";
import SettingsServiceHost from "./settingsservicehost";

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
        name: "light ring 16",
        services: () => [new LightServiceHost({ numPixels: 10, variant: LightVariant.Ring })]
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
        services: () => [new ServoServiceHost()]
    },
    {
        name: "servo (360)",
        services: () => [new ServoServiceHost({ minAngle: -180, maxAngle: 180 })]
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
        name: "thermometer (outdoor)",
        services: () => [new JDSensorServiceHost(SRV_THERMOMETER, outdoorThermometerOptions)]
    },
    {
        name: "thermometer (medical)",
        services: () => [new JDSensorServiceHost(SRV_THERMOMETER, medicalThermometerOptions)]
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