import { JDBus } from "../jdom/bus";
import {
    ArcadeGamepadButton,
    CharacterScreenTextDirection,
    CharacterScreenVariant,
    DistanceVariant, LedPixelVariant, PotentiometerVariant, RelayReg, RelayVariant, ServoVariant,
    SRV_ACCELEROMETER, SRV_ARCADE_GAMEPAD, SRV_BAROMETER, SRV_BUTTON, SRV_BUZZER, SRV_CHARACTER_SCREEN,
    SRV_DISTANCE, SRV_E_CO2, SRV_HUMIDITY, SRV_LED_PIXEL, SRV_MATRIX_KEYPAD,
    SRV_MOTOR, SRV_POTENTIOMETER,
    SRV_PROTO_TEST, SRV_RAIN_GAUGE, SRV_RELAY,
    SRV_ROLE_MANAGER, SRV_JOYSTICK,
    SRV_ROTARY_ENCODER,
    SRV_SERVO, SRV_SETTINGS, SRV_SWITCH, SRV_THERMOMETER, SRV_TRAFFIC_LIGHT,
    SRV_VIBRATION_MOTOR, SRV_TVOC, SRV_WIND_DIRECTION, SRV_WIND_SPEED,
    SwitchVariant, ThermometerVariant, WindSpeedReg, ECO2Variant, SRV_SPEECH_SYNTHESIS, SRV_SOIL_MOISTURE,
    JoystickVariant,
    SRV_REAL_TIME_CLOCK, SRV_ILLUMINANCE, SRV_LIGHT_LEVEL, LightLevelVariant,
    SRV_UVINDEX, SRV_REFLECTED_LIGHT, ReflectedLightVariant, SRV_MOTION, SRV_LED, SRV_SEVEN_SEGMENT_DISPLAY,
    SevenSegmentDisplayReg, SRV_HEART_RATE,
    HeartRateVariant, LedVariant, SRV_WATER_LEVEL, SRV_SOUND_LEVEL, SRV_COLOR, SRV_SOUND_PLAYER, SRV_PULSE_OXIMETER,
    SRV_WEIGHT_SCALE, WeightScaleVariant, SRV_ANALOG_BUTTON, AnalogButtonVariant, SRV_LEDMATRIX, SRV_RNG, SRV_COMPASS, SRV_THERMOCOUPLE, ThermometerReg, ThermocoupleVariant
} from "../jdom/constants";
import DeviceHost from "../jdom/devicehost";
import ProtocolTestServiceHost from "../jdom/protocoltestservicehost";
import ServiceHost, { ServiceHostOptions } from "../jdom/servicehost";
import ArcadeGamepadServiceHost from "./arcadegamepadservicehost";
import ButtonServiceHost from "./buttonservicehost";
import BuzzerServiceHost from "./buzzerservicehost";
import CharacterScreenServiceHost from "./characterscreenservicehost";
import HumidityServiceHost from "./humidityservicehost";
import JoystickSensorServiceHost from "./joystickservicehost";
import LEDMatrixServiceHost from "./ledmatrixservicehost";
import LedPixelServiceHost from "./ledpixelservicehost";
import MatrixKeypadServiceHost from "./matrixkeypadservicehost";
import MotorServiceHost from "./motorservicehost";
import RainGaugeServiceHost from "./raingaugeservicehost";
import RealTimeClockServiceHost from "./realtimeclockservicehost";
import ReflectedLightServiceHost from "./reflectedlightservicehost";
import RotaryEncoderServiceHost from "./rotaryencoderservicehost";
import SensorServiceHost from "./sensorservicehost";
import ServoServiceHost from "./servoservicehost";
import SettingsServiceHost from "./settingsservicehost";
import SpeechSynthesisServiceHost from "./speechsynthesisservicehost";
import SwitchServiceHost from "./switchservicehost";
import TrafficLightServiceHost from "./trafficlightservicehost";
import LEDServiceHost from "./ledservicehost";
import { fromHex } from "../jdom/utils";
import SoundPlayerServiceHost, { SoundPlayerSound } from "./soundplayerservicehost";
import AnalogSensorServiceHost, { AnalogSensorServiceHostOptions } from "./analogsensorservicehost";
import SoundLevelServiceHost from "./soundlevelservicehost";
import RandomNumberGeneratorServiceHost from "./randomnumbergeneratorservicehost";

const indoorThermometerOptions: AnalogSensorServiceHostOptions = {
    readingValues: [21.5],
    streamingInterval: 1000,
    minReading: -5,
    maxReading: 50,
    readingError: 0.25,
    variant: ThermometerVariant.Indoor
}
const outdoorThermometerOptions: AnalogSensorServiceHostOptions = {
    readingValues: [21.5],
    streamingInterval: 1000,
    minReading: -40,
    maxReading: 120,
    readingError: 0.25,
    variant: ThermometerVariant.Outdoor
}
const medicalThermometerOptions: AnalogSensorServiceHostOptions = {
    readingValues: [37.5],
    streamingInterval: 1000,
    minReading: 35,
    maxReading: 42,
    readingError: 0.5,
    variant: ThermometerVariant.Body
}
const barometerOptions: AnalogSensorServiceHostOptions = {
    readingValues: [1013]
}
const sonarOptions: AnalogSensorServiceHostOptions = {
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
const compassOptions: AnalogSensorServiceHostOptions = {
    readingValues: [0],
    readingError: 2
}
const windDirectionOptions: AnalogSensorServiceHostOptions = {
    readingValues: [0],
    readingError: 5
}
const windSpeedOptions: AnalogSensorServiceHostOptions = {
    readingValues: [0],
    readingError: 0.5,
    registerValues: [
        { code: WindSpeedReg.MaxWindSpeed, values: [55] }
    ]
}
const eCO2Options: AnalogSensorServiceHostOptions = {
    readingValues: [4000],
    variant: ECO2Variant.VOC
}
const CO2Options: AnalogSensorServiceHostOptions = {
    readingValues: [4000],
    variant: ECO2Variant.NDIR
}
const tvocOptions: AnalogSensorServiceHostOptions = {
    readingValues: [500]
}

const microbitSounds: SoundPlayerSound[] = [
    [0, "giggle"],
    [0, "happy"],
    [0, "hello"],
    [0, "mysterious"],
    [0, "sad"],
    [0, "slide"],
    [0, "soaring"],
    [0, "spring"],
    [0, "twinkle"],
    [0, "yawn"],
];
const touchButton: AnalogSensorServiceHostOptions = {
    lowThreshold: 0.3,
    highThreshold: 0.8,
    readingValues: [0],
    variant: AnalogButtonVariant.Capacitive
}

const _hosts: {
    name: string,
    serviceClasses: number[],
    services: () => ServiceHost[]
}[] = [
        {
            name: "7-segment (4 segments)",
            serviceClasses: [SRV_SEVEN_SEGMENT_DISPLAY],
            services: () => [new ServiceHost(SRV_SEVEN_SEGMENT_DISPLAY, {
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
            services: () => [new ServiceHost(SRV_SEVEN_SEGMENT_DISPLAY, {
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
            services: () => [new SensorServiceHost<[number, number, number]>(SRV_ACCELEROMETER, {
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
            services: () => [new AnalogSensorServiceHost(SRV_BAROMETER, barometerOptions)]
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
            name: "capacitive button",
            serviceClasses: [SRV_ANALOG_BUTTON],
            services: () => [new AnalogSensorServiceHost(SRV_ANALOG_BUTTON, touchButton)]
        },
        {
            name: "capacitive button (12x)",
            serviceClasses: [SRV_ANALOG_BUTTON],
            services: () => Array(12).fill(0).map((_, i) => new AnalogSensorServiceHost(SRV_ANALOG_BUTTON, { ...touchButton, ...{ instanceName: `C${i}` } }))
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
            name: "color",
            serviceClasses: [SRV_COLOR],
            services: () => [new SensorServiceHost<[number, number, number]>(SRV_COLOR, {
                readingValues: [0.5, 0, 0.5]
            })]
        },
        {
            name: "compass",
            serviceClasses: [SRV_COMPASS],
            services: () => [new AnalogSensorServiceHost(SRV_COMPASS, compassOptions)]
        },
        {
            name: "distance (sonar)",
            serviceClasses: [SRV_DISTANCE],
            services: () => [new AnalogSensorServiceHost(SRV_DISTANCE, sonarOptions)]
        },
        {
            name: "eCO₂",
            serviceClasses: [SRV_E_CO2],
            services: () => [new AnalogSensorServiceHost(SRV_E_CO2, eCO2Options)]
        },
        {
            name: "eCO₂ + TVOC",
            serviceClasses: [SRV_E_CO2, SRV_TVOC],
            services: () => [
                new AnalogSensorServiceHost(SRV_E_CO2, eCO2Options),
                new AnalogSensorServiceHost(SRV_TVOC, tvocOptions)]
        },
        {
            name: "eCO₂ + humidity + thermometer",
            serviceClasses: [SRV_E_CO2, SRV_HUMIDITY, SRV_THERMOMETER],
            services: () => [
                new AnalogSensorServiceHost(SRV_E_CO2, CO2Options),
                new HumidityServiceHost(),
                new AnalogSensorServiceHost(SRV_THERMOMETER, indoorThermometerOptions)
            ]
        },
        {
            name: "heart rate",
            serviceClasses: [SRV_HEART_RATE],
            services: () => [
                new AnalogSensorServiceHost(SRV_HEART_RATE, {
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
            services: () => [
                new HumidityServiceHost(),
                new AnalogSensorServiceHost(SRV_THERMOMETER, outdoorThermometerOptions)]
        },
        {
            name: "humidity + temperature + barometer",
            serviceClasses: [SRV_HUMIDITY, SRV_THERMOMETER, SRV_BAROMETER],
            services: () => [
                new HumidityServiceHost(),
                new AnalogSensorServiceHost(SRV_THERMOMETER, outdoorThermometerOptions),
                new AnalogSensorServiceHost(SRV_BAROMETER, barometerOptions)]
        },
        {
            name: "illuminance",
            serviceClasses: [SRV_ILLUMINANCE],
            services: () => [new AnalogSensorServiceHost(SRV_ILLUMINANCE, { readingValues: [1] })]
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
            serviceClasses: [SRV_LEDMATRIX],
            services: () => [new LEDMatrixServiceHost(5, 5)]
        },
        {
            name: "LED matrix (8x8)",
            serviceClasses: [SRV_LEDMATRIX],
            services: () => [new LEDMatrixServiceHost(8, 8)]
        },
        {
            name: "LED matrix (11x7)",
            serviceClasses: [SRV_LEDMATRIX],
            services: () => [new LEDMatrixServiceHost(11, 7)]
        },
        {
            name: "LED pixel ring 10",
            serviceClasses: [SRV_LED_PIXEL],
            services: () => [new LedPixelServiceHost({ numPixels: 10, variant: LedPixelVariant.Ring })]
        },
        {
            name: "LED pixel ring 12",
            serviceClasses: [SRV_LED_PIXEL],
            services: () => [new LedPixelServiceHost({ numPixels: 12, variant: LedPixelVariant.Ring })]
        },
        {
            name: "LED pixel ring 16",
            serviceClasses: [SRV_LED_PIXEL],
            services: () => [new LedPixelServiceHost({ numPixels: 16, variant: LedPixelVariant.Ring })]
        },
        {
            name: "LED pixel ring 24",
            serviceClasses: [SRV_LED_PIXEL],
            services: () => [new LedPixelServiceHost({ numPixels: 24, variant: LedPixelVariant.Ring })]
        },
        {
            name: "LED pixel jewel 7",
            serviceClasses: [SRV_LED_PIXEL],
            services: () => [new LedPixelServiceHost({ numPixels: 7, variant: LedPixelVariant.Jewel })]
        },
        {
            name: "LED pixel stick 8",
            serviceClasses: [SRV_LED_PIXEL],
            services: () => [new LedPixelServiceHost({ numPixels: 8, variant: LedPixelVariant.Stick })]
        },
        {
            name: "LED pixel strip 30",
            serviceClasses: [SRV_LED_PIXEL],
            services: () => [new LedPixelServiceHost({ numPixels: 60, maxPower: 1000, variant: LedPixelVariant.Strip })]
        },
        {
            name: "LED pixel strip 60",
            serviceClasses: [SRV_LED_PIXEL],
            services: () => [new LedPixelServiceHost({ numPixels: 60, maxPower: 2000, variant: LedPixelVariant.Strip })]
        },
        {
            name: "LED pixel strip 150",
            serviceClasses: [SRV_LED_PIXEL],
            services: () => [new LedPixelServiceHost({ numPixels: 150, maxPower: 5000, variant: LedPixelVariant.Strip })]
        },
        {
            name: "LED pixel strip 300",
            serviceClasses: [SRV_LED_PIXEL],
            services: () => [new LedPixelServiceHost({ numPixels: 300, maxPower: 5000, variant: LedPixelVariant.Strip })]
        },
        {
            name: "LED pixel matrix (4x4)",
            serviceClasses: [SRV_LED_PIXEL],
            services: () => [new LedPixelServiceHost({ numPixels: 16, variant: LedPixelVariant.Matrix })]
        },
        {
            name: "LED pixel matrix (8x8)",
            serviceClasses: [SRV_LED_PIXEL],
            services: () => [new LedPixelServiceHost({ numPixels: 64, variant: LedPixelVariant.Matrix })]
        },
        {
            name: "LED pixel matrix (16x4)",
            serviceClasses: [SRV_LED_PIXEL],
            services: () => [new LedPixelServiceHost({ numPixels: 64, numColumns: 16, variant: LedPixelVariant.Matrix })]
        },
        {
            name: "light level (photo-resistor)",
            serviceClasses: [SRV_LIGHT_LEVEL],
            services: () => [new SensorServiceHost(SRV_LIGHT_LEVEL, { readingValues: [0.5], variant: LightLevelVariant.PhotoResistor })]
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
            services: () => [new SensorServiceHost(SRV_MOTION, { readingValues: [false] })]
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
            name: "pulse oxymeter",
            serviceClasses: [SRV_PULSE_OXIMETER],
            services: () => [new SensorServiceHost<[number]>(SRV_PULSE_OXIMETER, {
                readingValues: [98],

            })]
        },
        {
            name: "oxymeter + heart beat",
            serviceClasses: [SRV_PULSE_OXIMETER, SRV_HEART_RATE],
            services: () => [new SensorServiceHost<[number]>(SRV_PULSE_OXIMETER, {
                readingValues: [98],

            }), new AnalogSensorServiceHost(SRV_HEART_RATE, {
                readingValues: [80],
                variant: HeartRateVariant.Finger
            })]
        },
        {
            name: "RNG (random number generator)",
            serviceClasses: [SRV_RNG],
            services: () => [new RandomNumberGeneratorServiceHost()]
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
            services: () => [new ServiceHost(SRV_RELAY, {
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
            services: () => Array(4).fill(0).map(_ => new ServiceHost(SRV_RELAY, {
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
            services: () => [new AnalogSensorServiceHost(SRV_POTENTIOMETER, {
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
            services: () => [new AnalogSensorServiceHost(SRV_POTENTIOMETER, { variant: PotentiometerVariant.Slider })]
        },
        {
            name: "soil moisture",
            serviceClasses: [SRV_SOIL_MOISTURE],
            services: () => [new AnalogSensorServiceHost(SRV_SOIL_MOISTURE, {
                readingValues: [0.5]
            })]
        },
        {
            name: "speech synthesis",
            serviceClasses: [SRV_SPEECH_SYNTHESIS],
            services: () => [new SpeechSynthesisServiceHost()]
        },
        {
            name: "sound level",
            serviceClasses: [SRV_SOUND_LEVEL],
            services: () => [new SoundLevelServiceHost()]
        },
        {
            name: "sound player (micro:bit v2 sounds)",
            serviceClasses: [SRV_SOUND_PLAYER],
            services: () => [new SoundPlayerServiceHost(microbitSounds)]
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
            services: () => [new SensorServiceHost(SRV_THERMOMETER, outdoorThermometerOptions)]
        },
        {
            name: "thermometer (medical)",
            serviceClasses: [SRV_THERMOMETER],
            services: () => [new AnalogSensorServiceHost(SRV_THERMOMETER, medicalThermometerOptions)]
        },
        {
            name: "traffic light",
            serviceClasses: [SRV_TRAFFIC_LIGHT],
            services: () => [new TrafficLightServiceHost()]
        },
        {
            name: "traffic crossing (4 x lights)",
            serviceClasses: [SRV_TRAFFIC_LIGHT],
            services: () => Array(4).fill(0).map(_ => new TrafficLightServiceHost())
        },
        {
            name: "thermocouple",
            serviceClasses: [SRV_THERMOCOUPLE],
            services: () => [new AnalogSensorServiceHost(SRV_THERMOCOUPLE, {
                readingValues: [550],
                streamingInterval: 1000,
                minReading: 0,
                maxReading: 1100,
                readingError: 2.2,
                variant: ThermocoupleVariant.TypeB
            })]
        },
        {
            name: "TVOC",
            serviceClasses: [SRV_TVOC],
            services: () => [new AnalogSensorServiceHost(SRV_TVOC, tvocOptions)]
        },
        {
            name: "UV index",
            serviceClasses: [SRV_UVINDEX],
            services: () => [new AnalogSensorServiceHost(SRV_UVINDEX, { readingValues: [5] })]
        },
        {
            name: "water level",
            serviceClasses: [SRV_WATER_LEVEL],
            services: () => [new AnalogSensorServiceHost(SRV_WATER_LEVEL, {
                readingValues: [0.5]
            })]
        },
        {
            name: "weight scale (jewelry)",
            serviceClasses: [SRV_WEIGHT_SCALE],
            services: () => [new AnalogSensorServiceHost(SRV_WEIGHT_SCALE, {
                readingValues: [0.001],
                variant: WeightScaleVariant.Jewelry,
                maxReading: 0.2,
                minReading: 0.0005,
                readingResolution: 0.00001
            })]
        },
        {
            name: "weight scale (body)",
            serviceClasses: [SRV_WEIGHT_SCALE],
            services: () => [new AnalogSensorServiceHost(SRV_WEIGHT_SCALE, {
                readingValues: [60],
                variant: WeightScaleVariant.Body,
                maxReading: 180,
                readingResolution: 0.1
            })]
        },
        {
            name: "weight scale (food)",
            serviceClasses: [SRV_WEIGHT_SCALE],
            services: () => [new AnalogSensorServiceHost(SRV_WEIGHT_SCALE, {
                readingValues: [0.5],
                variant: WeightScaleVariant.Food,
                maxReading: 6,
                readingResolution: 0.001
            })]
        },
        {
            name: "wind direction",
            serviceClasses: [SRV_WIND_DIRECTION],
            services: () => [new AnalogSensorServiceHost(SRV_WIND_DIRECTION, windDirectionOptions)]
        },
        {
            name: "wind speed",
            serviceClasses: [SRV_WIND_SPEED],
            services: () => [new AnalogSensorServiceHost(SRV_WIND_SPEED, windSpeedOptions)]
        },
        {
            name: "weather station (wind speed, direction, rain)",
            serviceClasses: [SRV_WIND_SPEED, SRV_WIND_DIRECTION, SRV_RAIN_GAUGE],
            services: () => [
                new AnalogSensorServiceHost(SRV_WIND_SPEED, windSpeedOptions),
                new AnalogSensorServiceHost(SRV_WIND_DIRECTION, windDirectionOptions),
                new RainGaugeServiceHost(),
            ]
        },
        {
            name: "vibration motor",
            serviceClasses: [SRV_VIBRATION_MOTOR],
            services: () => [new ServiceHost(SRV_VIBRATION_MOTOR)]
        },
        {
            name: "chassis (motor x 2 + sonar + light)",
            serviceClasses: [SRV_DISTANCE, SRV_LED_PIXEL, SRV_MOTOR],
            services: () => [
                new MotorServiceHost("L"),
                new MotorServiceHost("R"),
                new AnalogSensorServiceHost(SRV_DISTANCE, sonarOptions),
                new LedPixelServiceHost({ numPixels: 5, variant: LedPixelVariant.Stick })
            ]
        },
        {
            name: "railway crossing (2 x lights, 2 x servos, 1 x buffer)",
            serviceClasses: [SRV_TRAFFIC_LIGHT, SRV_SERVO, SRV_BUZZER],
            services: () => [
                new TrafficLightServiceHost(),
                new ServoServiceHost({
                    minAngle: 0,
                    maxAngle: 90
                }),
                new TrafficLightServiceHost(),
                new ServoServiceHost({
                    minAngle: 0,
                    maxAngle: 90
                }),
                new BuzzerServiceHost()
            ]
        },
        {
            name: "micro:bit v2",
            serviceClasses: [SRV_LEDMATRIX, SRV_BUTTON, SRV_ACCELEROMETER, SRV_SOUND_LEVEL, SRV_LIGHT_LEVEL, SRV_BUZZER, SRV_SOUND_PLAYER],
            services: () => [
                new LEDMatrixServiceHost(5, 5),
                new ButtonServiceHost("A"),
                new ButtonServiceHost("B"),
                new SensorServiceHost<[number, number, number]>(SRV_ACCELEROMETER, {
                    readingValues: [0.5, 0.5, -(1 - (0.5 * 0.5 + 0.5 * 0.5))]
                }),
                new SoundLevelServiceHost(),
                new SensorServiceHost(SRV_LIGHT_LEVEL, { readingValues: [0.5], variant: LightLevelVariant.LEDMatrix }),
                new BuzzerServiceHost(),
                new SoundPlayerServiceHost(microbitSounds),
            ]
        }
    ];

export default function hosts() {
    return _hosts.slice(0);
}

export function addHost(bus: JDBus, services: ServiceHost[], name?: string) {
    const d = new DeviceHost(services);
    const device = bus.addDeviceHost(d);
    if (name)
        device.name = name;
    return d;
}

export function hostDefinitionFromServiceClass(serviceClass: number) {
    return _hosts.find(host => host.serviceClasses[0] === serviceClass);
}