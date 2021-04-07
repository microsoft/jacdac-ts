import { JDBus } from "../jdom/bus"
import {
    ArcadeGamepadButton,
    CharacterScreenTextDirection,
    CharacterScreenVariant,
    DistanceVariant,
    LedPixelVariant,
    PotentiometerVariant,
    RelayReg,
    RelayVariant,
    SRV_ACCELEROMETER,
    SRV_ARCADE_GAMEPAD,
    SRV_BAROMETER,
    SRV_BUTTON,
    SRV_BUZZER,
    SRV_CHARACTER_SCREEN,
    SRV_DISTANCE,
    SRV_E_CO2,
    SRV_HUMIDITY,
    SRV_LED_PIXEL,
    SRV_MATRIX_KEYPAD,
    SRV_MOTOR,
    SRV_POTENTIOMETER,
    SRV_PROTO_TEST,
    SRV_RAIN_GAUGE,
    SRV_RELAY,
    SRV_JOYSTICK,
    SRV_ROTARY_ENCODER,
    SRV_SERVO,
    SRV_SETTINGS,
    SRV_SWITCH,
    SRV_THERMOMETER,
    SRV_TRAFFIC_LIGHT,
    SRV_VIBRATION_MOTOR,
    SRV_TVOC,
    SRV_WIND_DIRECTION,
    SRV_WIND_SPEED,
    SwitchVariant,
    ThermometerVariant,
    WindSpeedReg,
    ECO2Variant,
    SRV_SPEECH_SYNTHESIS,
    SRV_SOIL_MOISTURE,
    JoystickVariant,
    SRV_REAL_TIME_CLOCK,
    SRV_ILLUMINANCE,
    SRV_LIGHT_LEVEL,
    LightLevelVariant,
    SRV_UV_INDEX,
    SRV_REFLECTED_LIGHT,
    ReflectedLightVariant,
    SRV_MOTION,
    SRV_LED,
    SRV_SEVEN_SEGMENT_DISPLAY,
    SevenSegmentDisplayReg,
    SRV_HEART_RATE,
    HeartRateVariant,
    LedVariant,
    SRV_WATER_LEVEL,
    SRV_SOUND_LEVEL,
    SRV_COLOR,
    SRV_SOUND_PLAYER,
    SRV_PULSE_OXIMETER,
    SRV_WEIGHT_SCALE,
    WeightScaleVariant,
    SRV_ANALOG_BUTTON,
    AnalogButtonVariant,
    SRV_LED_MATRIX,
    SRV_RNG,
    SRV_COMPASS,
    SRV_THERMOCOUPLE,
    ThermocoupleVariant,
    SRV_GYROSCOPE,
    SoundLevelReg,
    SRV_SOUND_SPECTRUM,
    SoundSpectrumReg,
    SRV_SOLENOID,
    SRV_DMX,
    SRV_BIT_RADIO,
    SRV_POWER,
    CHANGE,
} from "../jdom/constants"
import JDServiceProvider from "../jdom/serviceprovider"
import ProtocolTestServer from "../jdom/protocoltestserver"
import JDServiceServer from "../jdom/serviceserver"
import ArcadeGamepadServer from "./arcadegamepadserver"
import ButtonServer from "./buttonserver"
import BuzzerServer from "./buzzerserver"
import CharacterScreenServer from "./characterserver"
import HumidityServer from "./humidityserver"
import JoystickSensorServer from "./joystickserver"
import LEDMatrixServer from "./ledmatrixserver"
import LedPixelServer from "./ledpixelserver"
import MatrixKeypadServer from "./matrixkeypadserver"
import MotorServer from "./motorserver"
import RainGaugeServer from "./raingaugeserver"
import RealTimeClockServer from "./realtimeclockserver"
import ReflectedLightServer from "./reflectedlightserver"
import RotaryEncoderServer from "./rotaryencoderserver"
import SensorServer, { SensorServiceOptions } from "./sensorserver"
import ServoServer from "./servoserver"
import SettingsServer from "./settingsserver"
import SpeechSynthesisServer from "./speechsynthesisserver"
import SwitchServer from "./switchserver"
import TrafficLightServer from "./trafficlightserver"
import LEDServer from "./ledserver"
import { fromHex } from "../jdom/utils"
import SoundPlayerServer, {
    SoundPlayerSound,
} from "./soundplayerserver"
import AnalogSensorServer, {
    AnalogSensorServerOptions,
} from "./analogsensorserver"
import RandomNumberGeneratorServer from "./randomnumbergeneratorserver"
import CompassServer from "./compassserver"
import DMXServer from "./dmxserver"
import BitRadioServer from "./bitradioserver"
import PowerServer from "./powerserver"

const indoorThermometerOptions: AnalogSensorServerOptions = {
    readingValues: [21.5],
    streamingInterval: 1000,
    minReading: -5,
    maxReading: 50,
    readingError: [0.25],
    variant: ThermometerVariant.Indoor,
}
const outdoorThermometerOptions: AnalogSensorServerOptions = {
    readingValues: [21.5],
    streamingInterval: 1000,
    minReading: -40,
    maxReading: 120,
    readingError: [0.25],
    variant: ThermometerVariant.Outdoor,
}
const medicalThermometerOptions: AnalogSensorServerOptions = {
    readingValues: [37.5],
    streamingInterval: 1000,
    minReading: 35,
    maxReading: 42,
    readingError: [0.5],
    variant: ThermometerVariant.Body,
}
const barometerOptions: AnalogSensorServerOptions = {
    readingValues: [1013],
}
const sonarOptions: AnalogSensorServerOptions = {
    variant: DistanceVariant.Ultrasonic,
    minReading: 0.02,
    maxReading: 4,
    readingValues: [1],
}

const SG90_STALL_TORQUE = 1.8
export const SG90_RESPONSE_SPEED = 0.12 // deg/60deg

const microServoOptions = {
    stallTorque: SG90_STALL_TORQUE, // kg/cm
    responseSpeed: SG90_RESPONSE_SPEED, // s/60deg
}
const microServo270Options = {
    stallTorque: SG90_STALL_TORQUE, // kg/cm
    responseSpeed: SG90_RESPONSE_SPEED, // s/60deg
    minAngle: -135,
    maxAngle: 135,
}
const microServo360Options = {
    stallTorque: SG90_STALL_TORQUE, // kg/cm
    responseSpeed: SG90_RESPONSE_SPEED * 2, // s/60deg
    minAngle: -180,
    maxAngle: 180,
}
const windDirectionOptions: AnalogSensorServerOptions = {
    readingValues: [0],
    readingError: [5],
    streamingInterval: 1000,
}
const windSpeedOptions: AnalogSensorServerOptions = {
    readingValues: [0],
    readingError: [0.5],
    streamingInterval: 1000,
    registerValues: [{ code: WindSpeedReg.MaxWindSpeed, values: [55] }],
}
const eCO2Options: AnalogSensorServerOptions = {
    readingValues: [4000],
    streamingInterval: 1000,
    variant: ECO2Variant.VOC,
}
const CO2Options: AnalogSensorServerOptions = {
    readingValues: [4000],
    streamingInterval: 1000,
    variant: ECO2Variant.NDIR,
}
const tvocOptions: AnalogSensorServerOptions = {
    readingValues: [500],
    streamingInterval: 1000,
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
]
const touchButton: AnalogSensorServerOptions = {
    lowThreshold: 0.3,
    highThreshold: 0.8,
    readingValues: [0],
    variant: AnalogButtonVariant.Capacitive,
}
const soundLevel: AnalogSensorServerOptions = {
    readingValues: [0],
    lowThreshold: 10,
    highThreshold: 70,
    intensityValues: [false],
    registerValues: [
        {
            code: SoundLevelReg.MinDecibels,
            values: [-100],
        },
        {
            code: SoundLevelReg.MaxDecibels,
            values: [-30],
        },
    ],
}
const soundSpectrum: SensorServiceOptions<[Uint8Array]> = {
    readingValues: [new Uint8Array(0)],
    intensityValues: [false],
    registerValues: [
        {
            code: SoundSpectrumReg.FftPow2Size,
            values: [5],
        },
        {
            code: SoundSpectrumReg.MinDecibels,
            values: [-100],
        },
        {
            code: SoundSpectrumReg.MaxDecibels,
            values: [-30],
        },
        {
            code: SoundSpectrumReg.SmoothingTimeConstant,
            values: [0.8],
        },
    ],
}

export interface ServiceProviderDefinition {
    name: string
    serviceClasses: number[]
    services: () => JDServiceServer[]
    factory?: (services: JDServiceServer[]) => JDServiceProvider
}

const _providerDefinitions: ServiceProviderDefinition[] = [
    {
        name: "7-segment (4 segments)",
        serviceClasses: [SRV_SEVEN_SEGMENT_DISPLAY],
        services: () => [
            new JDServiceServer(SRV_SEVEN_SEGMENT_DISPLAY, {
                intensityValues: [0xffff],
                valueValues: [fromHex("ff112233")],
                registerValues: [
                    {
                        code: SevenSegmentDisplayReg.DigitCount,
                        values: [4],
                    },
                    {
                        code: SevenSegmentDisplayReg.DecimalPoint,
                        values: [true],
                    },
                ],
            }),
        ],
    },
    {
        name: "7-segment (8 segments)",
        serviceClasses: [SRV_SEVEN_SEGMENT_DISPLAY],
        services: () => [
            new JDServiceServer(SRV_SEVEN_SEGMENT_DISPLAY, {
                intensityValues: [0xffff],
                valueValues: [fromHex("0102040810204080")],
                registerValues: [
                    {
                        code: SevenSegmentDisplayReg.DigitCount,
                        values: [8],
                    },
                    {
                        code: SevenSegmentDisplayReg.DecimalPoint,
                        values: [true],
                    },
                ],
            }),
        ],
    },
    {
        name: "accelerometer",
        serviceClasses: [SRV_ACCELEROMETER],
        services: () => [
            new SensorServer<[number, number, number]>(SRV_ACCELEROMETER, {
                readingValues: [0.5, 0.5, -(1 - (0.5 * 0.5 + 0.5 * 0.5))],
            }),
        ],
    },
    {
        name: "arcade gamepad (all buttons)",
        serviceClasses: [SRV_ARCADE_GAMEPAD],
        services: () => [new ArcadeGamepadServer()],
    },
    {
        name: "arcade gamepad (only DPad+A/B)",
        serviceClasses: [SRV_ARCADE_GAMEPAD],
        services: () => [
            new ArcadeGamepadServer([
                ArcadeGamepadButton.Left,
                ArcadeGamepadButton.Right,
                ArcadeGamepadButton.Up,
                ArcadeGamepadButton.Down,
                ArcadeGamepadButton.A,
                ArcadeGamepadButton.B,
            ]),
        ],
    },
    {
        name: "barometer",
        serviceClasses: [SRV_BAROMETER],
        services: () => [
            new AnalogSensorServer(SRV_BAROMETER, barometerOptions),
        ],
    },
    {
        name: "bitradio",
        serviceClasses: [SRV_BIT_RADIO],
        services: () => [new BitRadioServer()],
    },
    {
        name: "button",
        serviceClasses: [SRV_BUTTON],
        services: () => [new ButtonServer()],
    },
    {
        name: "button (2x)",
        serviceClasses: [SRV_BUTTON],
        services: () => [
            new ButtonServer("B0"),
            new ButtonServer("B1"),
        ],
    },
    {
        name: "button (4x)",
        serviceClasses: [SRV_BUTTON],
        services: () =>
            Array(4)
                .fill(0)
                .map((_, i) => new ButtonServer(`B${i}`)),
    },
    {
        name: "buzzer",
        serviceClasses: [SRV_BUZZER],
        services: () => [new BuzzerServer()],
    },
    {
        name: "capacitive button",
        serviceClasses: [SRV_ANALOG_BUTTON],
        services: () => [
            new AnalogSensorServer(SRV_ANALOG_BUTTON, touchButton),
        ],
    },
    {
        name: "capacitive button (6x)",
        serviceClasses: [SRV_ANALOG_BUTTON],
        services: () =>
            Array(6)
                .fill(0)
                .map(
                    (_, i) =>
                        new AnalogSensorServer(SRV_ANALOG_BUTTON, {
                            ...touchButton,
                            ...{ instanceName: `C${i}` },
                        })
                ),
    },
    {
        name: "capacitive button (12x)",
        serviceClasses: [SRV_ANALOG_BUTTON],
        services: () =>
            Array(12)
                .fill(0)
                .map(
                    (_, i) =>
                        new AnalogSensorServer(SRV_ANALOG_BUTTON, {
                            ...touchButton,
                            ...{ instanceName: `C${i}` },
                        })
                ),
    },
    {
        name: "character screen (LDC, 16x2)",
        serviceClasses: [SRV_CHARACTER_SCREEN],
        services: () => [
            new CharacterScreenServer({ message: "hello\nworld!" }),
        ],
    },
    {
        name: "character screen (OLED, 32x8, RTL)",
        serviceClasses: [SRV_CHARACTER_SCREEN],
        services: () => [
            new CharacterScreenServer({
                message: "hello\nworld!",
                columns: 32,
                rows: 8,
                variant: CharacterScreenVariant.OLED,
                textDirection: CharacterScreenTextDirection.RightToLeft,
            }),
        ],
    },
    {
        name: "color",
        serviceClasses: [SRV_COLOR],
        services: () => [
            new SensorServer<[number, number, number]>(SRV_COLOR, {
                readingValues: [0.5, 0, 0.5],
            }),
        ],
    },
    {
        name: "compass",
        serviceClasses: [SRV_COMPASS],
        services: () => [new CompassServer()],
    },
    {
        name: "distance (sonar)",
        serviceClasses: [SRV_DISTANCE],
        services: () => [
            new AnalogSensorServer(SRV_DISTANCE, sonarOptions),
        ],
    },
    {
        name: "DMX",
        serviceClasses: [SRV_DMX],
        services: () => [new DMXServer()],
    },
    {
        name: "eCO₂",
        serviceClasses: [SRV_E_CO2],
        services: () => [new AnalogSensorServer(SRV_E_CO2, eCO2Options)],
    },
    {
        name: "eCO₂ + TVOC",
        serviceClasses: [SRV_E_CO2, SRV_TVOC],
        services: () => [
            new AnalogSensorServer(SRV_E_CO2, eCO2Options),
            new AnalogSensorServer(SRV_TVOC, tvocOptions),
        ],
    },
    {
        name: "eCO₂ + humidity + thermometer",
        serviceClasses: [SRV_E_CO2, SRV_HUMIDITY, SRV_THERMOMETER],
        services: () => [
            new AnalogSensorServer(SRV_E_CO2, CO2Options),
            new HumidityServer(),
            new AnalogSensorServer(
                SRV_THERMOMETER,
                indoorThermometerOptions
            ),
        ],
    },
    {
        name: "gyroscope",
        serviceClasses: [SRV_GYROSCOPE],
        services: () => [
            new SensorServer<[number, number, number]>(SRV_GYROSCOPE, {
                readingValues: [0, 0, 0],
            }),
        ],
    },
    {
        name: "heart rate",
        serviceClasses: [SRV_HEART_RATE],
        services: () => [
            new AnalogSensorServer(SRV_HEART_RATE, {
                readingValues: [80],
                streamingInterval: 100,
                variant: HeartRateVariant.Finger,
            }),
        ],
    },
    {
        name: "humidity",
        serviceClasses: [SRV_HUMIDITY],
        services: () => [new HumidityServer()],
    },
    {
        name: "humidity + temperature",
        serviceClasses: [SRV_HUMIDITY, SRV_THERMOMETER],
        services: () => [
            new AnalogSensorServer(
                SRV_THERMOMETER,
                outdoorThermometerOptions
            ),
            new HumidityServer(),
        ],
    },
    {
        name: "humidity + temperature + barometer",
        serviceClasses: [SRV_HUMIDITY, SRV_THERMOMETER, SRV_BAROMETER],
        services: () => [
            new AnalogSensorServer(
                SRV_THERMOMETER,
                outdoorThermometerOptions
            ),
            new HumidityServer(),
            new AnalogSensorServer(SRV_BAROMETER, barometerOptions),
        ],
    },
    {
        name: "illuminance",
        serviceClasses: [SRV_ILLUMINANCE],
        services: () => [
            new AnalogSensorServer(SRV_ILLUMINANCE, {
                readingValues: [1],
            }),
        ],
    },
    {
        name: "joystick (thumbstick)",
        serviceClasses: [SRV_JOYSTICK],
        services: () => [new JoystickSensorServer(JoystickVariant.Thumb)],
    },
    {
        name: "joystick (arcade stick digital)",
        serviceClasses: [SRV_JOYSTICK],
        services: () => [
            new JoystickSensorServer(JoystickVariant.ArcadeStick, true),
        ],
    },
    {
        name: "LED (RGB through hole)",
        serviceClasses: [SRV_LED],
        services: () => [
            new LEDServer({
                variant: LedVariant.ThroughHole,
                ledCount: 1,
                color: [255, 0, 0],
            }),
        ],
    },
    {
        name: "LED (blue through hole)",
        serviceClasses: [SRV_LED],
        services: () => [
            new LEDServer({
                variant: LedVariant.ThroughHole,
                waveLength: 624,
                ledCount: 3,
                color: [0, 0, 255],
            }),
        ],
    },
    {
        name: "LED matrix (5x5 micro:bit)",
        serviceClasses: [SRV_LED_MATRIX],
        services: () => [new LEDMatrixServer(5, 5)],
    },
    {
        name: "LED matrix (8x8)",
        serviceClasses: [SRV_LED_MATRIX],
        services: () => [new LEDMatrixServer(8, 8)],
    },
    {
        name: "LED matrix (11x7)",
        serviceClasses: [SRV_LED_MATRIX],
        services: () => [new LEDMatrixServer(11, 7)],
    },
    {
        name: "LED pixel ring 10",
        serviceClasses: [SRV_LED_PIXEL],
        services: () => [
            new LedPixelServer({
                numPixels: 10,
                variant: LedPixelVariant.Ring,
            }),
        ],
    },
    {
        name: "LED pixel ring 12",
        serviceClasses: [SRV_LED_PIXEL],
        services: () => [
            new LedPixelServer({
                numPixels: 12,
                variant: LedPixelVariant.Ring,
            }),
        ],
    },
    {
        name: "LED pixel ring 16",
        serviceClasses: [SRV_LED_PIXEL],
        services: () => [
            new LedPixelServer({
                numPixels: 16,
                variant: LedPixelVariant.Ring,
            }),
        ],
    },
    {
        name: "LED pixel ring 24",
        serviceClasses: [SRV_LED_PIXEL],
        services: () => [
            new LedPixelServer({
                numPixels: 24,
                variant: LedPixelVariant.Ring,
            }),
        ],
    },
    {
        name: "LED pixel jewel 7",
        serviceClasses: [SRV_LED_PIXEL],
        services: () => [
            new LedPixelServer({
                numPixels: 7,
                variant: LedPixelVariant.Jewel,
            }),
        ],
    },
    {
        name: "LED pixel stick 8",
        serviceClasses: [SRV_LED_PIXEL],
        services: () => [
            new LedPixelServer({
                numPixels: 8,
                variant: LedPixelVariant.Stick,
            }),
        ],
    },
    {
        name: "LED pixel strip 30",
        serviceClasses: [SRV_LED_PIXEL],
        services: () => [
            new LedPixelServer({
                numPixels: 60,
                maxPower: 1000,
                variant: LedPixelVariant.Strip,
            }),
        ],
    },
    {
        name: "LED pixel strip 60",
        serviceClasses: [SRV_LED_PIXEL],
        services: () => [
            new LedPixelServer({
                numPixels: 60,
                maxPower: 2000,
                variant: LedPixelVariant.Strip,
            }),
        ],
    },
    {
        name: "LED pixel strip 150",
        serviceClasses: [SRV_LED_PIXEL],
        services: () => [
            new LedPixelServer({
                numPixels: 150,
                maxPower: 5000,
                variant: LedPixelVariant.Strip,
            }),
        ],
    },
    {
        name: "LED pixel strip 300",
        serviceClasses: [SRV_LED_PIXEL],
        services: () => [
            new LedPixelServer({
                numPixels: 300,
                maxPower: 5000,
                variant: LedPixelVariant.Strip,
            }),
        ],
    },
    {
        name: "LED pixel matrix (4x4)",
        serviceClasses: [SRV_LED_PIXEL],
        services: () => [
            new LedPixelServer({
                numPixels: 16,
                variant: LedPixelVariant.Matrix,
            }),
        ],
    },
    {
        name: "LED pixel matrix (8x8)",
        serviceClasses: [SRV_LED_PIXEL],
        services: () => [
            new LedPixelServer({
                numPixels: 64,
                variant: LedPixelVariant.Matrix,
            }),
        ],
    },
    {
        name: "LED pixel matrix (16x4)",
        serviceClasses: [SRV_LED_PIXEL],
        services: () => [
            new LedPixelServer({
                numPixels: 64,
                numColumns: 16,
                variant: LedPixelVariant.Matrix,
            }),
        ],
    },
    {
        name: "light level (photo-resistor)",
        serviceClasses: [SRV_LIGHT_LEVEL],
        services: () => [
            new SensorServer(SRV_LIGHT_LEVEL, {
                readingValues: [0.5],
                variant: LightLevelVariant.PhotoResistor,
            }),
        ],
    },
    {
        name: "line tracker (digital)",
        serviceClasses: [SRV_REFLECTED_LIGHT],
        services: () => [new ReflectedLightServer()],
    },
    {
        name: "line tracker (2x digital)",
        serviceClasses: [SRV_REFLECTED_LIGHT],
        services: () => [
            new ReflectedLightServer(),
            new ReflectedLightServer(),
        ],
    },
    {
        name: "line tracker (analog)",
        serviceClasses: [SRV_REFLECTED_LIGHT],
        services: () => [
            new ReflectedLightServer({
                variant: ReflectedLightVariant.InfraredAnalog,
            }),
        ],
    },
    {
        name: "matrix keypad (3x4)",
        serviceClasses: [SRV_MATRIX_KEYPAD],
        services: () => [
            new MatrixKeypadServer(3, 4, [
                "0",
                "1",
                "2",
                "3",
                "4",
                "5",
                "6",
                "7",
                "8",
                "*",
                "0",
                "#",
            ]),
        ],
    },
    {
        name: "matrix keypad (4x4)",
        serviceClasses: [SRV_MATRIX_KEYPAD],
        services: () => [
            new MatrixKeypadServer(4, 4, [
                "0",
                "1",
                "2",
                "A",
                "3",
                "4",
                "5",
                "B",
                "6",
                "7",
                "8",
                "C",
                "*",
                "0",
                "#",
                "D",
            ]),
        ],
    },
    {
        name: "matrix keypad (1x4)",
        serviceClasses: [SRV_MATRIX_KEYPAD],
        services: () => [
            new MatrixKeypadServer(4, 1, ["1", "2", "3", "4"]),
        ],
    },
    {
        name: "motion",
        serviceClasses: [SRV_MOTION],
        services: () => [
            new SensorServer(SRV_MOTION, {
                readingValues: [false],
                streamingInterval: 1000,
            }),
        ],
    },
    {
        name: "motor",
        serviceClasses: [SRV_MOTOR],
        services: () => [new MotorServer()],
    },
    {
        name: "protocol test",
        serviceClasses: [SRV_PROTO_TEST],
        services: () => [new ProtocolTestServer()],
    },
    {
        name: "pulse oxymeter",
        serviceClasses: [SRV_PULSE_OXIMETER],
        services: () => [
            new SensorServer<[number]>(SRV_PULSE_OXIMETER, {
                readingValues: [98],
                streamingInterval: 1000,
            }),
        ],
    },
    {
        name: "oxymeter + heart beat",
        serviceClasses: [SRV_PULSE_OXIMETER, SRV_HEART_RATE],
        services: () => [
            new SensorServer<[number]>(SRV_PULSE_OXIMETER, {
                readingValues: [98],
                streamingInterval: 1000,
            }),
            new AnalogSensorServer(SRV_HEART_RATE, {
                readingValues: [80],
                streamingInterval: 1000,
                variant: HeartRateVariant.Finger,
            }),
        ],
    },
    {
        name: "power",
        serviceClasses: [SRV_POWER],
        services: () => [new PowerServer()],
    },
    {
        name: "RNG (random number generator)",
        serviceClasses: [SRV_RNG],
        services: () => [new RandomNumberGeneratorServer()],
    },
    {
        name: "rain gauge",
        serviceClasses: [SRV_RAIN_GAUGE],
        services: () => [new RainGaugeServer()],
    },
    {
        name: "real time clock",
        serviceClasses: [SRV_REAL_TIME_CLOCK],
        services: () => [new RealTimeClockServer()],
    },
    {
        name: "relay (EM/10A)",
        serviceClasses: [SRV_RELAY],
        services: () => [
            new JDServiceServer(SRV_RELAY, {
                intensityValues: [false],
                variant: RelayVariant.Electromechanical,
                registerValues: [
                    {
                        code: RelayReg.MaxSwitchingCurrent,
                        values: [10],
                    },
                ],
            }),
        ],
    },
    {
        name: "relay 4x (SSR/5A)",
        serviceClasses: [SRV_RELAY],
        services: () =>
            Array(4)
                .fill(0)
                .map(
                    () =>
                        new JDServiceServer(SRV_RELAY, {
                            intensityValues: [false],
                            variant: RelayVariant.SolidState,
                            registerValues: [
                                {
                                    code: RelayReg.MaxSwitchingCurrent,
                                    values: [5],
                                },
                            ],
                        })
                ),
    },
    {
        name: "rotary encoder",
        serviceClasses: [SRV_ROTARY_ENCODER],
        services: () => [new RotaryEncoderServer()],
    },
    {
        name: "rotary encoder + button",
        serviceClasses: [SRV_ROTARY_ENCODER, SRV_BUTTON],
        services: () => [
            new RotaryEncoderServer(),
            new ButtonServer(),
        ],
    },
    {
        name: "rotary potentiometer",
        serviceClasses: [SRV_POTENTIOMETER],
        services: () => [
            new AnalogSensorServer(SRV_POTENTIOMETER, {
                variant: PotentiometerVariant.Rotary,
                readingValues: [0.5],
            }),
        ],
    },
    {
        name: "servo",
        serviceClasses: [SRV_SERVO],
        services: () => [new ServoServer(microServoOptions)],
    },
    {
        name: "servo (270°)",
        serviceClasses: [SRV_SERVO],
        services: () => [new ServoServer(microServo270Options)],
    },
    {
        name: "servo (360°)",
        serviceClasses: [SRV_SERVO],
        services: () => [new ServoServer(microServo360Options)],
    },
    {
        name: "servo x 2",
        serviceClasses: [SRV_SERVO],
        services: () =>
            Array(2)
                .fill(0)
                .map(
                    (_, i) =>
                        new ServoServer({
                            ...microServoOptions,
                            instanceName: `S${i}`,
                        })
                ),
    },
    {
        name: "servo x 4",
        serviceClasses: [SRV_SERVO],
        services: () =>
            Array(4)
                .fill(0)
                .map(
                    (_, i) =>
                        new ServoServer({
                            ...microServoOptions,
                            instanceName: `S${i}`,
                        })
                ),
    },
    {
        name: "servo x 6",
        serviceClasses: [SRV_SERVO],
        services: () =>
            Array(6)
                .fill(0)
                .map(
                    (_, i) =>
                        new ServoServer({
                            ...microServoOptions,
                            instanceName: `S${i}`,
                        })
                ),
    },
    {
        name: "servo x 16",
        serviceClasses: [SRV_SERVO],
        services: () =>
            Array(16)
                .fill(0)
                .map(
                    (_, i) =>
                        new ServoServer({
                            ...microServoOptions,
                            instanceName: `S${i}`,
                        })
                ),
    },
    {
        name: "settings",
        serviceClasses: [SRV_SETTINGS],
        services: () => [new SettingsServer()],
    },
    {
        name: "slider",
        serviceClasses: [SRV_POTENTIOMETER],
        services: () => [
            new AnalogSensorServer(SRV_POTENTIOMETER, {
                variant: PotentiometerVariant.Slider,
            }),
        ],
    },
    {
        name: "soil moisture",
        serviceClasses: [SRV_SOIL_MOISTURE],
        services: () => [
            new AnalogSensorServer(SRV_SOIL_MOISTURE, {
                readingValues: [0.5],
                streamingInterval: 1000,
            }),
        ],
    },
    {
        name: "speech synthesis",
        serviceClasses: [SRV_SPEECH_SYNTHESIS],
        services: () => [new SpeechSynthesisServer()],
    },
    {
        name: "solenoid",
        serviceClasses: [SRV_SOLENOID],
        services: () => [
            new JDServiceServer(SRV_SOLENOID, {
                intensityValues: [0],
            }),
        ],
    },
    {
        name: "sound level",
        serviceClasses: [SRV_SOUND_LEVEL],
        services: () => [
            new AnalogSensorServer(SRV_SOUND_LEVEL, soundLevel),
        ],
    },
    {
        name: "sound spectrum",
        serviceClasses: [SRV_SOUND_SPECTRUM],
        services: () => [
            new SensorServer<[Uint8Array]>(
                SRV_SOUND_SPECTRUM,
                soundSpectrum
            ),
        ],
    },
    {
        name: "sound player (micro:bit v2 sounds)",
        serviceClasses: [SRV_SOUND_PLAYER],
        services: () => [new SoundPlayerServer(microbitSounds)],
    },
    {
        name: "switch (slide)",
        serviceClasses: [SRV_SWITCH],
        services: () => [
            new SwitchServer({ variant: SwitchVariant.Slide }),
        ],
    },
    {
        name: "switch (push button)",
        serviceClasses: [SRV_SWITCH],
        services: () => [
            new SwitchServer({ variant: SwitchVariant.PushButton }),
        ],
    },
    {
        name: "switch (toggle)",
        serviceClasses: [SRV_SWITCH],
        services: () => [
            new SwitchServer({ variant: SwitchVariant.Toggle }),
        ],
    },
    {
        name: "switch (tilt)",
        serviceClasses: [SRV_SWITCH],
        services: () => [
            new SwitchServer({ variant: SwitchVariant.Tilt }),
        ],
    },
    {
        name: "switch (proximity)",
        serviceClasses: [SRV_SWITCH],
        services: () => [
            new SwitchServer({
                variant: SwitchVariant.Proximity,
                autoOffDelay: 30,
            }),
        ],
    },
    {
        name: "thermometer (outdoor)",
        serviceClasses: [SRV_THERMOMETER],
        services: () => [
            new AnalogSensorServer(
                SRV_THERMOMETER,
                outdoorThermometerOptions
            ),
        ],
    },
    {
        name: "thermometer (medical)",
        serviceClasses: [SRV_THERMOMETER],
        services: () => [
            new AnalogSensorServer(
                SRV_THERMOMETER,
                medicalThermometerOptions
            ),
        ],
    },
    {
        name: "traffic light",
        serviceClasses: [SRV_TRAFFIC_LIGHT],
        services: () => [new TrafficLightServer()],
    },
    {
        name: "traffic crossing (4 x lights)",
        serviceClasses: [SRV_TRAFFIC_LIGHT],
        services: () =>
            Array(4)
                .fill(0)
                .map(_ => new TrafficLightServer()),
    },
    {
        name: "thermocouple",
        serviceClasses: [SRV_THERMOCOUPLE],
        services: () => [
            new AnalogSensorServer(SRV_THERMOCOUPLE, {
                readingValues: [550],
                streamingInterval: 1000,
                minReading: 0,
                maxReading: 1100,
                readingError: [2.2],
                variant: ThermocoupleVariant.TypeB,
            }),
        ],
    },
    {
        name: "TVOC",
        serviceClasses: [SRV_TVOC],
        services: () => [new AnalogSensorServer(SRV_TVOC, tvocOptions)],
    },
    {
        name: "UV index",
        serviceClasses: [SRV_UV_INDEX],
        services: () => [
            new AnalogSensorServer(SRV_UV_INDEX, {
                readingValues: [5],
                streamingInterval: 1000,
            }),
        ],
    },
    {
        name: "water level",
        serviceClasses: [SRV_WATER_LEVEL],
        services: () => [
            new AnalogSensorServer(SRV_WATER_LEVEL, {
                readingValues: [0.5],
                streamingInterval: 1000,
            }),
        ],
    },
    {
        name: "weight scale (jewelry)",
        serviceClasses: [SRV_WEIGHT_SCALE],
        services: () => [
            new AnalogSensorServer(SRV_WEIGHT_SCALE, {
                readingValues: [0.001],
                variant: WeightScaleVariant.Jewelry,
                maxReading: 0.2,
                minReading: 0.0005,
                readingResolution: 0.00001,
            }),
        ],
    },
    {
        name: "weight scale (body)",
        serviceClasses: [SRV_WEIGHT_SCALE],
        services: () => [
            new AnalogSensorServer(SRV_WEIGHT_SCALE, {
                readingValues: [60],
                variant: WeightScaleVariant.Body,
                maxReading: 180,
                readingResolution: 0.1,
            }),
        ],
    },
    {
        name: "weight scale (food)",
        serviceClasses: [SRV_WEIGHT_SCALE],
        services: () => [
            new AnalogSensorServer(SRV_WEIGHT_SCALE, {
                readingValues: [0.5],
                variant: WeightScaleVariant.Food,
                maxReading: 6,
                readingResolution: 0.001,
            }),
        ],
    },
    {
        name: "wind direction",
        serviceClasses: [SRV_WIND_DIRECTION],
        services: () => [
            new AnalogSensorServer(
                SRV_WIND_DIRECTION,
                windDirectionOptions
            ),
        ],
    },
    {
        name: "wind speed",
        serviceClasses: [SRV_WIND_SPEED],
        services: () => [
            new AnalogSensorServer(SRV_WIND_SPEED, windSpeedOptions),
        ],
    },
    {
        name: "weather station (wind speed, direction, rain)",
        serviceClasses: [SRV_WIND_SPEED, SRV_WIND_DIRECTION, SRV_RAIN_GAUGE],
        services: () => [
            new AnalogSensorServer(SRV_WIND_SPEED, windSpeedOptions),
            new AnalogSensorServer(
                SRV_WIND_DIRECTION,
                windDirectionOptions
            ),
            new RainGaugeServer(),
        ],
    },
    {
        name: "vibration motor",
        serviceClasses: [SRV_VIBRATION_MOTOR],
        services: () => [new JDServiceServer(SRV_VIBRATION_MOTOR)],
    },
    {
        name: "chassis (motor x 2 + sonar + light)",
        serviceClasses: [SRV_DISTANCE, SRV_LED_PIXEL, SRV_MOTOR],
        services: () => [
            new MotorServer("L"),
            new MotorServer("R"),
            new AnalogSensorServer(SRV_DISTANCE, sonarOptions),
            new LedPixelServer({
                numPixels: 5,
                variant: LedPixelVariant.Stick,
                instanceName: "lights",
            }),
        ],
    },
    {
        name: "railway crossing (2 x lights, 2 x servos, 1 x buffer)",
        serviceClasses: [SRV_TRAFFIC_LIGHT, SRV_SERVO, SRV_BUZZER],
        services: () => [
            new TrafficLightServer({ instanceName: "left light" }),
            new ServoServer({
                minAngle: 0,
                maxAngle: 90,
                instanceName: "left arm",
            }),
            new TrafficLightServer({ instanceName: "right light" }),
            new ServoServer({
                minAngle: 0,
                maxAngle: 90,
                instanceName: "right arm",
            }),
            new BuzzerServer({ instanceName: "bell" }),
        ],
    },
    {
        name: "Arcade controller (6 x buttons)",
        serviceClasses: [SRV_BUTTON],
        services: () => [
            new ButtonServer("Left"),
            new ButtonServer("Up"),
            new ButtonServer("Right"),
            new ButtonServer("Down"),
            new ButtonServer("A"),
            new ButtonServer("B"),
        ],
    },
    {
        name: "micro:bit v2",
        serviceClasses: [
            SRV_LED_MATRIX,
            SRV_BUTTON,
            SRV_ACCELEROMETER,
            SRV_SOUND_LEVEL,
            SRV_LIGHT_LEVEL,
            SRV_BUZZER,
            SRV_SOUND_PLAYER,
        ],
        services: () => [
            new LEDMatrixServer(5, 5),
            new ButtonServer("A"),
            new ButtonServer("B"),
            new SensorServer<[number, number, number]>(SRV_ACCELEROMETER, {
                readingValues: [0.5, 0.5, -(1 - (0.5 * 0.5 + 0.5 * 0.5))],
            }),
            new AnalogSensorServer(SRV_SOUND_LEVEL, soundLevel),
            new SensorServer(SRV_LIGHT_LEVEL, {
                readingValues: [0.5],
                variant: LightLevelVariant.LEDMatrix,
            }),
            new BuzzerServer(),
            new SoundPlayerServer(microbitSounds),
        ],
    },
    {
        name: "power + humidity",
        serviceClasses: [SRV_POWER, SRV_HUMIDITY],
        services: () => [new PowerServer(), new HumidityServer()],
        factory: services => {
            const dev = new JDServiceProvider([services[0]])
            const pwr = dev.service(1) as PowerServer
            pwr.enabled.on(CHANGE, () => {
                const enabled = !!pwr.enabled.values()[0]
                console.log(`power: ${enabled ? "on" : "off"}`)
                if (enabled)
                    // power + rest
                    dev.updateServices(services)
                // power only
                else dev.updateServices([services[0]])
            })
            return dev
        },
    },
]

export default function serviceProviderDefinitions() {
    return _providerDefinitions.slice(0)
}

export function addServiceProvider(bus: JDBus, definition: ServiceProviderDefinition) {
    const services = definition.services()
    const d = definition.factory?.(services) || new JDServiceProvider(services)
    bus.addServiceProvider(d)
    return d
}

export function serviceProviderDefinitionFromServiceClass(serviceClass: number) {
    return _providerDefinitions.find(
        host =>
            host.serviceClasses.length === 1 &&
            host.serviceClasses[0] === serviceClass
    )
}
