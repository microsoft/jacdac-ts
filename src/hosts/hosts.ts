import { JDBus } from "../jdom/bus";
import {
    ArcadeGamepadButton,
    CharacterScreenTextDirection,
    CharacterScreenVariant,
    DistanceVariant, LedPixelVariant, PotentiometerVariant, RelayReg, RelayVariant, ServoVariant,
    SRV_ACCELEROMETER, SRV_ARCADE_GAMEPAD, SRV_BAROMETER, SRV_BUTTON, SRV_BUZZER, SRV_CHARACTER_SCREEN,
    SRV_DISTANCE, SRV_E_CO2, SRV_HUMIDITY, SRV_LED_MATRIX_DISPLAY, SRV_LED_PIXEL, SRV_MATRIX_KEYPAD, SRV_MOTOR, SRV_POTENTIOMETER,
    SRV_PROTO_TEST, SRV_RAIN_GAUGE, SRV_RELAY,
    SRV_ROLE_MANAGER, SRV_JOYSTICK,
    SRV_ROTARY_ENCODER,
    SRV_SERVO, SRV_SETTINGS, SRV_SWITCH, SRV_THERMOMETER, SRV_TRAFFIC_LIGHT,
    SRV_VIBRATION_MOTOR, SRV_TVOC, SRV_WIND_DIRECTION, SRV_WIND_SPEED,
    SwitchVariant, ThermometerVariant, WindSpeedReg, ECO2Variant, SRV_SPEECH_SYNTHESIS, SRV_SOIL_MOISTURE, JoystickVariant,
    SRV_REAL_TIME_CLOCK, SRV_ILLUMINANCE, SRV_LIGHT_LEVEL, LightLevelVariant,
    SRV_UVINDEX, SRV_REFLECTED_LIGHT, ReflectedLightVariant, SRV_MOTION, SRV_LED, SRV_SEVEN_SEGMENT_DISPLAY,
    SevenSegmentDisplayReg, SRV_HEART_RATE, HeartRateVariant, LedVariant, SRV_WATER_LEVEL
} from "../jdom/constants";
import JDDeviceHost from "../jdom/devicehost";
import ProtocolTestServiceHost from "../jdom/protocoltestservicehost";
import JDServiceHost, { JDServiceHostOptions } from "../jdom/servicehost";
import ArcadeGamepadServiceHost from "./arcadegamepadservicehost";
import ButtonServiceHost from "./buttonservicehost";
import BuzzerServiceHost from "./buzzerservicehost";
import CharacterScreenServiceHost from "./characterscreenservicehost";
import HumidityServiceHost from "./humidityservicehost";
import JoystickSensorServiceHost from "./joystickservicehost";
import LEDMatrixDisplayServiceHost from "./ledmatrixdisplayservicehost";
import LedPixelServiceHost from "./ledpixelservicehost";
import MatrixKeypadServiceHost from "./matrixkeypadservicehost";
import MotorServiceHost from "./motorservicehost";
import RainGaugeServiceHost from "./raingaugeservicehost";
import RealTimeClockServiceHost from "./realtimeclockservicehost";
import ReflectedLightServiceHost from "./reflectedlightservicehost";
import RotaryEncoderServiceHost from "./rotaryencoderservicehost";
import JDSensorServiceHost, { JDSensorServiceOptions } from "./sensorservicehost";
import ServoServiceHost from "./servoservicehost";
import SettingsServiceHost from "./settingsservicehost";
import SpeechSynthesisServiceHost from "./speechsynthesisservicehost";
import SwitchServiceHost from "./switchservicehost";
import TrafficLightServiceHost from "./trafficlightservicehost";
import LEDServiceHost from "./ledservicehost";
import { fromHex } from "../jdom/utils";

const indoorThermometerOptions = {
    readingValues: [21.5],
    streamingInterval: 1000,
    minReading: -5,
    maxReading: 50,
    readingError: 0.25,
    variant: ThermometerVariant.Indoor
}
const outdoorThermometerOptions = {
    readingValues: [21.5],
    streamingInterval: 1000,
    minReading: -40,
    maxReading: 120,
    readingError: 0.25,
    variant: ThermometerVariant.Outdoor
}
const medicalThermometerOptions = {
    readingValues: [37.5],
    streamingInterval: 1000,
    minReading: 35,
    maxReading: 42,
    readingError: 0.5,
    variant: ThermometerVariant.Body
}
const barometerOptions: JDSensorServiceOptions<[number]> = {
    readingValues: [1013]
}
const sonarOptions = {
    variant: DistanceVariant.Ultrasonic,
    minReading: 0.02,
    maxReading: 4,
    readingValues: [1]
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
const windDirectionOptions = {
    readingValues: [0],
    readingError: 5
}
const windSpeedOptions = {
    readingValues: [0],
    readingError: 0.5,
    registerValues: [
        { code: WindSpeedReg.MaxWindSpeed, values: [55] }
    ]
}
const eCO2Options: JDSensorServiceOptions<[number]> & JDServiceHostOptions = {
    readingValues: [4000],
    variant: ECO2Variant.VOC
}
const CO2Options: JDSensorServiceOptions<[number]> & JDServiceHostOptions = {
    readingValues: [4000],
    variant: ECO2Variant.NDIR
}
const tvocOptions: JDSensorServiceOptions<[number]> = {
    readingValues: [500]
}

const _hosts: {
    name: string,
    serviceClasses: number[],
    services: () => JDServiceHost[]
}[] = [
        {
            name: "7-segment (4 segments)",
            serviceClasses: [SRV_SEVEN_SEGMENT_DISPLAY],
            services: () => [new JDServiceHost(SRV_SEVEN_SEGMENT_DISPLAY, {
                intensityValues: [0xffff],
                valueValues: [fromHex("ff112233")],
                registerValues: [{
                    code: SevenSegmentDisplayReg.DigitCount,
                    values: [4]
                }, {
                    code: SevenSegmentDisplayReg.DecimalPoint,
                    values: [true]
                }]
            })]
        },
        {
            name: "7-segment (8 segments)",
            serviceClasses: [SRV_SEVEN_SEGMENT_DISPLAY],
            services: () => [new JDServiceHost(SRV_SEVEN_SEGMENT_DISPLAY, {
                intensityValues: [0xffff],
                valueValues: [fromHex("0102040810204080")],
                registerValues: [{
                    code: SevenSegmentDisplayReg.DigitCount,
                    values: [8]
                }, {
                    code: SevenSegmentDisplayReg.DecimalPoint,
                    values: [true]
                }]
            })]
        },
        {
            name: "accelerometer",
            serviceClasses: [SRV_ACCELEROMETER],
            services: () => [new JDSensorServiceHost<[number, number, number]>(SRV_ACCELEROMETER, {
                readingValues: [0.5, 0.5, -(1 - (0.5 * 0.5 + 0.5 * 0.5))]
            })]
        },
        {
            name: "arcade gamepad (all buttons)",
            serviceClasses: [SRV_ARCADE_GAMEPAD],
            services: () => [new ArcadeGamepadServiceHost()]
        },
        {
            name: "arcade gamepad (only DPad+A/B)",
            serviceClasses: [SRV_ARCADE_GAMEPAD],
            services: () => [new ArcadeGamepadServiceHost([
                ArcadeGamepadButton.Left,
                ArcadeGamepadButton.Right,
                ArcadeGamepadButton.Up,
                ArcadeGamepadButton.Down,
                ArcadeGamepadButton.A,
                ArcadeGamepadButton.B,
            ])]
        },
        {
            name: "barometer",
            serviceClasses: [SRV_BAROMETER],
            services: () => [new JDSensorServiceHost<[number]>(SRV_BAROMETER, barometerOptions)]
        },
        {
            name: "button",
            serviceClasses: [SRV_BUTTON],
            services: () => [new ButtonServiceHost()]
        },
        {
            name: "button (2x)",
            serviceClasses: [SRV_BUTTON],
            services: () => [new ButtonServiceHost(), new ButtonServiceHost()]
        },
        {
            name: "buzzer",
            serviceClasses: [SRV_BUZZER],
            services: () => [new BuzzerServiceHost()]
        },
        {
            name: "character screen (LDC, 16x2)",
            serviceClasses: [SRV_CHARACTER_SCREEN],
            services: () => [new CharacterScreenServiceHost({ message: "hello\nworld!" })]
        },
        {
            name: "character screen (OLED, 32x8, RTL)",
            serviceClasses: [SRV_CHARACTER_SCREEN],
            services: () => [new CharacterScreenServiceHost({
                message: "hello\nworld!",
                columns: 32,
                rows: 8,
                variant: CharacterScreenVariant.OLED,
                textDirection: CharacterScreenTextDirection.RightToLeft
            })]
        },
        {
            name: "distance (sonar)",
            serviceClasses: [SRV_DISTANCE],
            services: () => [new JDSensorServiceHost(SRV_DISTANCE, sonarOptions)]
        },
        {
            name: "eCO²",
            serviceClasses: [SRV_E_CO2],
            services: () => [new JDSensorServiceHost<[number]>(SRV_E_CO2, eCO2Options)]
        },
        {
            name: "eCO² + TVOC",
            serviceClasses: [SRV_E_CO2, SRV_TVOC],
            services: () => [new JDSensorServiceHost<[number]>(SRV_E_CO2, eCO2Options), new JDSensorServiceHost<[number]>(SRV_TVOC, tvocOptions)]
        },
        {
            name: "eCO² + humidity + thermometer",
            serviceClasses: [SRV_E_CO2, SRV_HUMIDITY, SRV_THERMOMETER],
            services: () => [
                new JDSensorServiceHost<[number]>(SRV_E_CO2, CO2Options),
                new HumidityServiceHost(),
                new JDSensorServiceHost(SRV_THERMOMETER, indoorThermometerOptions)
            ]
        },
        {
            name: "heart rate",
            serviceClasses: [SRV_HEART_RATE],
            services: () => [
                new JDSensorServiceHost<[number]>(SRV_HEART_RATE, {
                    readingValues: [80],
                    variant: HeartRateVariant.Finger
                })
            ]
        },
        {
            name: "humidity",
            serviceClasses: [SRV_HUMIDITY],
            services: () => [new HumidityServiceHost()]
        },
        {
            name: "humidity + temperature",
            serviceClasses: [SRV_HUMIDITY, SRV_THERMOMETER],
            services: () => [new HumidityServiceHost(), new JDSensorServiceHost(SRV_THERMOMETER, outdoorThermometerOptions)]
        },
        {
            name: "humidity + temperature + barometer",
            serviceClasses: [SRV_HUMIDITY, SRV_THERMOMETER, SRV_BAROMETER],
            services: () => [
                new HumidityServiceHost(),
                new JDSensorServiceHost(SRV_THERMOMETER, outdoorThermometerOptions),
                new JDSensorServiceHost(SRV_BAROMETER, barometerOptions)]
        },
        {
            name: "illuminance",
            serviceClasses: [SRV_ILLUMINANCE],
            services: () => [new JDSensorServiceHost(SRV_ILLUMINANCE, { readingValues: [1] })]
        },
        {
            name: "joystick (thumbstick)",
            serviceClasses: [SRV_JOYSTICK],
            services: () => [new JoystickSensorServiceHost(JoystickVariant.Thumb)]
        },
        {
            name: "joystick (arcade stick digital)",
            serviceClasses: [SRV_JOYSTICK],
            services: () => [new JoystickSensorServiceHost(JoystickVariant.ArcadeStick, true)]
        },
        {
            name: "LED (RGB through hole)",
            serviceClasses: [SRV_LED],
            services: () => [new LEDServiceHost({
                variant: LedVariant.ThroughHole,
                ledCount: 2,
                steps:
                    [
                        [0xff >> 1, 0xff, 0xff >> 1, 3000 >> 3],
                        [0xff, 0xff, 0xff, 30000 >> 3],
                    ]
            })]
        },
        {
            name: "LED (blue through hole)",
            serviceClasses: [SRV_LED],
            services: () => [new LEDServiceHost({
                variant: LedVariant.ThroughHole,
                waveLength: 624,
                ledCount: 3,
                steps: [[0, 0, 0xff, 0xff]]
            })]
        },
        {
            name: "LED matrix (5x5 micro:bit)",
            serviceClasses: [SRV_LED_MATRIX_DISPLAY],
            services: () => [new LEDMatrixDisplayServiceHost(5, 5)]
        },
        {
            name: "LED matrix (8x8)",
            serviceClasses: [SRV_LED_MATRIX_DISPLAY],
            services: () => [new LEDMatrixDisplayServiceHost(8, 8)]
        },
        {
            name: "LED matrix (11x7)",
            serviceClasses: [SRV_LED_MATRIX_DISPLAY],
            services: () => [new LEDMatrixDisplayServiceHost(11, 7)]
        },
        {
            name: "light level (photo-resistor)",
            serviceClasses: [SRV_LIGHT_LEVEL],
            services: () => [new JDSensorServiceHost(SRV_LIGHT_LEVEL, { readingValues: [0.5], variant: LightLevelVariant.PhotoResistor })]
        },
        {
            name: "light ring 10",
            serviceClasses: [SRV_LED_PIXEL],
            services: () => [new LedPixelServiceHost({ numPixels: 10, variant: LedPixelVariant.Ring })]
        },
        {
            name: "light ring 12",
            serviceClasses: [SRV_LED_PIXEL],
            services: () => [new LedPixelServiceHost({ numPixels: 12, variant: LedPixelVariant.Ring })]
        },
        {
            name: "light ring 16",
            serviceClasses: [SRV_LED_PIXEL],
            services: () => [new LedPixelServiceHost({ numPixels: 16, variant: LedPixelVariant.Ring })]
        },
        {
            name: "light ring 24",
            serviceClasses: [SRV_LED_PIXEL],
            services: () => [new LedPixelServiceHost({ numPixels: 24, variant: LedPixelVariant.Ring })]
        },
        {
            name: "light jewel 7",
            serviceClasses: [SRV_LED_PIXEL],
            services: () => [new LedPixelServiceHost({ numPixels: 7, variant: LedPixelVariant.Jewel })]
        },
        {
            name: "light stick 8",
            serviceClasses: [SRV_LED_PIXEL],
            services: () => [new LedPixelServiceHost({ numPixels: 8, variant: LedPixelVariant.Stick })]
        },
        {
            name: "light strip 30",
            serviceClasses: [SRV_LED_PIXEL],
            services: () => [new LedPixelServiceHost({ numPixels: 60, maxPower: 1000, variant: LedPixelVariant.Strip })]
        },
        {
            name: "light strip 60",
            serviceClasses: [SRV_LED_PIXEL],
            services: () => [new LedPixelServiceHost({ numPixels: 60, maxPower: 2000, variant: LedPixelVariant.Strip })]
        },
        {
            name: "light strip 150",
            serviceClasses: [SRV_LED_PIXEL],
            services: () => [new LedPixelServiceHost({ numPixels: 150, maxPower: 5000, variant: LedPixelVariant.Strip })]
        },
        {
            name: "light strip 300",
            serviceClasses: [SRV_LED_PIXEL],
            services: () => [new LedPixelServiceHost({ numPixels: 300, maxPower: 5000, variant: LedPixelVariant.Strip })]
        },
        {
            name: "line tracker (digital)",
            serviceClasses: [SRV_REFLECTED_LIGHT],
            services: () => [new ReflectedLightServiceHost()]
        },
        {
            name: "line tracker (2x digital)",
            serviceClasses: [SRV_REFLECTED_LIGHT],
            services: () => [new ReflectedLightServiceHost(), new ReflectedLightServiceHost()]
        },
        {
            name: "line tracker (analog)",
            serviceClasses: [SRV_REFLECTED_LIGHT],
            services: () => [new ReflectedLightServiceHost({ variant: ReflectedLightVariant.InfraredAnalog })]
        },
        {
            name: "matrix keypad (3x4)",
            serviceClasses: [SRV_MATRIX_KEYPAD],
            services: () => [new MatrixKeypadServiceHost(3, 4, [
                "0", "1", "2",
                "3", "4", "5",
                "6", "7", "8",
                "*", "0", "#"])]
        },
        {
            name: "matrix keypad (4x4)",
            serviceClasses: [SRV_MATRIX_KEYPAD],
            services: () => [new MatrixKeypadServiceHost(4, 4, [
                "0", "1", "2", "A",
                "3", "4", "5", "B",
                "6", "7", "8", "C",
                "*", "0", "#", "D"])]
        },
        {
            name: "matrix keypad (1x4)",
            serviceClasses: [SRV_MATRIX_KEYPAD],
            services: () => [new MatrixKeypadServiceHost(4, 1, ["1", "2", "3", "4"])]
        },
        {
            name: "motion",
            serviceClasses: [SRV_MOTION],
            services: () => [new JDSensorServiceHost(SRV_MOTION, { readingValues: [false] })]
        },
        {
            name: "motor",
            serviceClasses: [SRV_MOTOR],
            services: () => [new MotorServiceHost()]
        },
        {
            name: "protocol test",
            serviceClasses: [SRV_PROTO_TEST],
            services: () => [new ProtocolTestServiceHost()]
        },
        {
            name: "rain gauge",
            serviceClasses: [SRV_RAIN_GAUGE],
            services: () => [new RainGaugeServiceHost()]
        },
        {
            name: "real time clock",
            serviceClasses: [SRV_REAL_TIME_CLOCK],
            services: () => [new RealTimeClockServiceHost()]
        },
        {
            name: "relay (EM/10A)",
            serviceClasses: [SRV_RELAY],
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
            serviceClasses: [SRV_RELAY],
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
            serviceClasses: [SRV_ROTARY_ENCODER],
            services: () => [new RotaryEncoderServiceHost()]
        },
        {
            name: "rotary encoder + button",
            serviceClasses: [SRV_ROTARY_ENCODER, SRV_BUTTON],
            services: () => [new RotaryEncoderServiceHost(), new ButtonServiceHost()]
        },
        {
            name: "rotary potentiometer",
            serviceClasses: [SRV_POTENTIOMETER],
            services: () => [new JDSensorServiceHost(SRV_POTENTIOMETER, {
                variant: PotentiometerVariant.Rotary,
                readingValues: [0.5]
            })]
        },
        {
            name: "servo",
            serviceClasses: [SRV_SERVO],
            services: () => [new ServoServiceHost(microServoOptions)]
        },
        {
            name: "servo (270°)",
            serviceClasses: [SRV_SERVO],
            services: () => [new ServoServiceHost(microServo270Options)]
        },
        {
            name: "servo (360°)",
            serviceClasses: [SRV_SERVO],
            services: () => [new ServoServiceHost(microServo360Options)]
        },
        {
            name: "servo x 2",
            serviceClasses: [SRV_SERVO],
            services: () => Array(2).fill(0).map((_, i) => new ServoServiceHost(microServoOptions))
        },
        {
            name: "servo x 4",
            serviceClasses: [SRV_SERVO],
            services: () => Array(4).fill(0).map((_, i) => new ServoServiceHost(microServoOptions))
        },
        {
            name: "servo x 6",
            serviceClasses: [SRV_SERVO],
            services: () => Array(6).fill(0).map((_, i) => new ServoServiceHost(microServoOptions))
        },
        {
            name: "servo x 16",
            serviceClasses: [SRV_SERVO],
            services: () => Array(16).fill(0).map((_, i) => new ServoServiceHost(microServoOptions))
        },
        {
            name: "settings",
            serviceClasses: [SRV_SETTINGS],
            services: () => [new SettingsServiceHost()]
        },
        {
            name: "slider",
            serviceClasses: [SRV_POTENTIOMETER],
            services: () => [new JDSensorServiceHost<[number]>(SRV_POTENTIOMETER, { variant: PotentiometerVariant.Slider })]
        },
        {
            name: "soil moisture",
            serviceClasses: [SRV_SOIL_MOISTURE],
            services: () => [new JDSensorServiceHost<[number]>(SRV_SOIL_MOISTURE, {
                readingValues: [0]
            })]
        },
        {
            name: "speech synthesis",
            serviceClasses: [SRV_SPEECH_SYNTHESIS],
            services: () => [new SpeechSynthesisServiceHost()]
        },
        {
            name: "switch (slide)",
            serviceClasses: [SRV_SWITCH],
            services: () => [new SwitchServiceHost({ variant: SwitchVariant.Slide })]
        },
        {
            name: "switch (push button)",
            serviceClasses: [SRV_SWITCH],
            services: () => [new SwitchServiceHost({ variant: SwitchVariant.PushButton })]
        },
        {
            name: "switch (toggle)",
            serviceClasses: [SRV_SWITCH],
            services: () => [new SwitchServiceHost({ variant: SwitchVariant.Toggle })]
        },
        {
            name: "switch (tilt)",
            serviceClasses: [SRV_SWITCH],
            services: () => [new SwitchServiceHost({ variant: SwitchVariant.Tilt })]
        },
        {
            name: "switch (proximity)",
            serviceClasses: [SRV_SWITCH],
            services: () => [new SwitchServiceHost({ variant: SwitchVariant.Proximity, autoOffDelay: 30 })]
        },
        {
            name: "thermometer (outdoor)",
            serviceClasses: [SRV_THERMOMETER],
            services: () => [new JDSensorServiceHost(SRV_THERMOMETER, outdoorThermometerOptions)]
        },
        {
            name: "thermometer (medical)",
            serviceClasses: [SRV_THERMOMETER],
            services: () => [new JDSensorServiceHost(SRV_THERMOMETER, medicalThermometerOptions)]
        },
        {
            name: "traffic light",
            serviceClasses: [SRV_TRAFFIC_LIGHT],
            services: () => [new TrafficLightServiceHost()]
        },
        {
            name: "thermocouple",
            serviceClasses: [SRV_THERMOMETER],
            services: () => [new JDSensorServiceHost(SRV_THERMOMETER, {
                readingValues: [550],
                streamingInterval: 1000,
                minReading: 0,
                maxReading: 1100,
                readingError: 2.2,
                variant: ThermometerVariant.Thermocouple
            })]
        },
        {
            name: "TVOC",
            serviceClasses: [SRV_TVOC],
            services: () => [new JDSensorServiceHost<[number]>(SRV_TVOC, tvocOptions)]
        },
        {
            name: "UV index",
            serviceClasses: [SRV_UVINDEX],
            services: () => [new JDSensorServiceHost<[number]>(SRV_UVINDEX, { readingValues: [5] })]
        },
        {
            name: "water level",
            serviceClasses: [SRV_WATER_LEVEL],
            services: () => [new JDSensorServiceHost<[number]>(SRV_WATER_LEVEL, { 
                readingValues: [0.5],
                lowThreshold: 0.2,
                highTreshold: 0.8
            })]
        },
        {
            name: "wind direction",
            serviceClasses: [SRV_WIND_DIRECTION],
            services: () => [new JDSensorServiceHost(SRV_WIND_DIRECTION, windDirectionOptions)]
        },
        {
            name: "wind speed",
            serviceClasses: [SRV_WIND_SPEED],
            services: () => [new JDSensorServiceHost(SRV_WIND_SPEED, windSpeedOptions)]
        },
        {
            name: "weather station (wind speed, direction, rain)",
            serviceClasses: [SRV_WIND_SPEED, SRV_WIND_DIRECTION, SRV_RAIN_GAUGE],
            services: () => [
                new JDSensorServiceHost(SRV_WIND_SPEED, windSpeedOptions),
                new JDSensorServiceHost(SRV_WIND_DIRECTION, windDirectionOptions),
                new RainGaugeServiceHost(),
            ]
        },
        {
            name: "vibration motor",
            serviceClasses: [SRV_VIBRATION_MOTOR],
            services: () => [new JDServiceHost(SRV_VIBRATION_MOTOR)]
        },
        {
            name: "chassis (motor x 2 + sonar + light)",
            serviceClasses: [SRV_DISTANCE, SRV_LED_PIXEL, SRV_MOTOR],
            services: () => [
                new MotorServiceHost(),
                new MotorServiceHost(),
                new JDSensorServiceHost(SRV_DISTANCE, sonarOptions),
                new LedPixelServiceHost({ numPixels: 5, variant: LedPixelVariant.Stick })
            ]
        }
    ];

export default function hosts() {
    return _hosts.slice(0);
}

export function addHost(bus: JDBus, services: JDServiceHost[], name?: string) {
    const d = new JDDeviceHost(services);
    const device = bus.addDeviceHost(d);
    if (name)
        device.name = name;
    return d;
}

export function hostDefinitionFromServiceClass(serviceClass: number) {
    return _hosts.find(host => host.serviceClasses[0] === serviceClass);
}