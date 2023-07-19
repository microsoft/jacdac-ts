import { JDBus } from "../jdom/bus"
import {
    CharacterScreenTextDirection,
    CharacterScreenVariant,
    DistanceVariant,
    LedStripVariant,
    PotentiometerVariant,
    RelayReg,
    RelayVariant,
    SRV_ACIDITY,
    SRV_ACCELEROMETER,
    SRV_AIR_PRESSURE,
    SRV_BUTTON,
    SRV_BUZZER,
    SRV_CHARACTER_SCREEN,
    SRV_BRAILLE_DISPLAY,
    SRV_DISTANCE,
    SRV_E_CO2,
    SRV_HUMIDITY,
    SRV_LED_STRIP,
    SRV_MATRIX_KEYPAD,
    SRV_MOTOR,
    SRV_POTENTIOMETER,
    SRV_PROTO_TEST,
    SRV_RAIN_GAUGE,
    SRV_RELAY,
    SRV_GAMEPAD,
    SRV_ROTARY_ENCODER,
    SRV_SERVO,
    SRV_SETTINGS,
    SRV_SWITCH,
    SRV_TEMPERATURE,
    SRV_TRAFFIC_LIGHT,
    SRV_VIBRATION_MOTOR,
    SRV_TVOC,
    SRV_WIND_DIRECTION,
    SRV_WIND_SPEED,
    SwitchVariant,
    TemperatureVariant,
    WindSpeedReg,
    ECO2Variant,
    SRV_SPEECH_SYNTHESIS,
    SRV_SOIL_MOISTURE,
    GamepadVariant,
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
    SRV_DOT_MATRIX,
    SRV_RNG,
    SRV_COMPASS,
    SRV_GYROSCOPE,
    SRV_SOUND_SPECTRUM,
    SoundSpectrumReg,
    SRV_SOLENOID,
    SRV_DMX,
    SRV_BIT_RADIO,
    SRV_POWER,
    CHANGE,
    GamepadButtons,
    SRV_HID_KEYBOARD,
    SRV_HID_MOUSE,
    SRV_HID_JOYSTICK,
    DotMatrixVariant,
    SRV_FLEX,
    SRV_WIFI,
    SRV_LIGHT_BULB,
    LightBulbReg,
    WifiAPFlags,
    SRV_POWER_SUPPLY,
    MagneticFieldLevelVariant,
    SRV_MAGNETIC_FIELD_LEVEL,
    SRV_DUAL_MOTORS,
    SRV_CLOUD_ADAPTER,
    SRV_SAT_NAV,
    SRV_DC_VOLTAGE_MEASUREMENT,
    SRV_DC_CURRENT_MEASUREMENT,
    DcCurrentMeasurementReg,
    DcVoltageMeasurementReg,
    DcVoltageMeasurementVoltageMeasurementType,
    SRV_PLANAR_POSITION,
    SRV_SERIAL,
    SystemReg,
    SRV_ROS,
    SRV_INDEXED_SCREEN,
} from "../jdom/constants"
import { JDServerServiceProvider } from "../jdom/servers/serverserviceprovider"
import { ProtocolTestServer } from "../jdom/servers/protocoltestserver"
import { JDServiceServer } from "../jdom/servers/serviceserver"
import { ButtonServer } from "./buttonserver"
import { BuzzerServer } from "./buzzerserver"
import { CharacterScreenServer } from "./characterscreenserver"
import {
    GamepadServer,
    GAMEPAD_ARCADE_BUTTONS,
    GAMEPAD_DPAD_AB_BUTTONS,
} from "./gamepadserver"
import { DotMatrixServer } from "./dotmatrixserver"
import { LedStripServer } from "./ledstripserver"
import { MatrixKeypadServer } from "./matrixkeypadserver"
import { MotorServer } from "./motorserver"
import { RainGaugeServer } from "./raingaugeserver"
import { RealTimeClockServer } from "./realtimeclockserver"
import { ReflectedLightServer } from "./reflectedlightserver"
import { RotaryEncoderServer } from "./rotaryencoderserver"
import { SensorServer, SensorServiceOptions } from "./sensorserver"
import { ServoServer } from "./servoserver"
import { SettingsServer } from "./settingsserver"
import { SpeechSynthesisServer } from "./speechsynthesisserver"
import { SwitchServer } from "./switchserver"
import { TrafficLightServer } from "./trafficlightserver"
import { fromHex, hash, stringToUint8Array, toFullHex } from "../jdom/utils"
import { SoundPlayerServer, SoundPlayerSound } from "./soundplayerserver"
import {
    AnalogSensorServer,
    AnalogSensorServerOptions,
} from "./analogsensorserver"
import { RandomNumberGeneratorServer } from "./randomnumbergeneratorserver"
import { CompassServer } from "./compassserver"
import { DMXServer } from "./dmxserver"
import { BitRadioServer } from "./bitradioserver"
import { PowerServer } from "./powerserver"
import { CapacitiveButtonServer } from "./capacitivebuttonserver"
import { HIDKeyboardServer } from "./hidkeyboardserver"
import { HIDMouseServer } from "./hidmouseserver"
import { JDServiceProvider } from "../jdom/servers/serviceprovider"
import { VibrationMotorServer } from "./vibrationmotorserver"
import { WifiServer } from "./wifiserver"
import { AccelerometerServer } from "./accelerometerserver"
import { BrailleDisplayServer } from "./brailledisplayserver"
import { Flags } from "../jdom/flags"
import { LedServer } from "./ledserver"
import { PowerSupplyServer } from "./powersupplyserver"
import { HIDJoystickServer } from "./hidjoystickserver"
import {
    isActuator,
    isConstRegister,
    isReading,
    isSensor,
    serviceSpecificationFromClassIdentifier,
} from "../jdom/spec"
import { PackedSimpleValue } from "../jdom/pack"
import { MagneticFieldLevelServer } from "./magneticfieldlevelserver"
import { DualMotorsServer } from "./dualmotorsserver"
import { CloudAdapterServer } from "./cloudadapterserver"
import { SatNavServer } from "./satnavserver"
import { PlanarPositionServer } from "./planarpositionserver"
import { SerialServer } from "./serialserver"
import { genFieldInfo, isNumericType } from "../../jacdac-spec/spectool/jdspec"
import { RosServer } from "./rosserver"
import { IndexedScreenServer } from "./indexedscreenserver"
import { randomDeviceId } from "../jdom/random"

const indoorThermometerOptions: AnalogSensorServerOptions = {
    readingValues: [21.5],
    streamingInterval: 1000,
    minReading: -5,
    maxReading: 50,
    readingError: [0.25],
    variant: TemperatureVariant.Indoor,
}
const outdoorThermometerOptions: AnalogSensorServerOptions = {
    readingValues: [21.5],
    streamingInterval: 1000,
    minReading: -40,
    maxReading: 120,
    readingError: [0.25],
    variant: TemperatureVariant.Outdoor,
}
const outdoorHumidityOptions: AnalogSensorServerOptions = {
    streamingInterval: 1000,
    readingValues: [40],
    readingError: [0.1],
    minReading: 10,
    maxReading: 99,
}
const soilThermometerOptions: AnalogSensorServerOptions = {
    readingValues: [15],
    streamingInterval: 1000,
    minReading: -55,
    maxReading: 125,
    readingError: [0.5],
    variant: TemperatureVariant.Outdoor,
}
const medicalThermometerOptions: AnalogSensorServerOptions = {
    readingValues: [37.5],
    streamingInterval: 1000,
    minReading: 35,
    maxReading: 42,
    readingError: [0.5],
    variant: TemperatureVariant.Body,
}
const barometerOptions: AnalogSensorServerOptions = {
    readingValues: [1013],
    readingError: [1.5],
    streamingInterval: 1000,
    minReading: 150,
    maxReading: 4000,
}
const sonarOptions: AnalogSensorServerOptions = {
    variant: DistanceVariant.Ultrasonic,
    minReading: 0.02,
    maxReading: 4,
    readingValues: [1],
}

const SG90_STALL_TORQUE = 1.8
/**
 * @internal
 */
export const SG90_RESPONSE_SPEED = 0.12 // deg/60deg

const microServoOptions = {
    stallTorque: SG90_STALL_TORQUE, // kg/cm
    responseSpeed: SG90_RESPONSE_SPEED, // s/60deg
    minAngle: 0,
    maxAngle: 180,
}
const microServoContinuousOptions = {
    stallTorque: SG90_STALL_TORQUE, // kg/cm
    responseSpeed: SG90_RESPONSE_SPEED, // s/60deg
    minAngle: -90,
    maxAngle: 90,
    clientVariant: "cont=1",
}
const microServo270Options = {
    stallTorque: SG90_STALL_TORQUE, // kg/cm
    responseSpeed: SG90_RESPONSE_SPEED, // s/60deg
    minAngle: 0,
    maxAngle: 270,
}
const microServo360Options = {
    stallTorque: SG90_STALL_TORQUE, // kg/cm
    responseSpeed: SG90_RESPONSE_SPEED * 2, // s/60deg
    minAngle: 0,
    maxAngle: 360,
}
const windDirectionOptions: AnalogSensorServerOptions = {
    readingValues: [0],
    readingError: [5],
    streamingInterval: 5000,
}
const windSpeedOptions: AnalogSensorServerOptions = {
    readingValues: [0],
    readingError: [2],
    streamingInterval: 5000,
    registerValues: [{ code: WindSpeedReg.MaxWindSpeed, values: [80] }],
}
const eCO2Options: AnalogSensorServerOptions = {
    readingValues: [400],
    streamingInterval: 1000,
    variant: ECO2Variant.VOC,
}
const CO2Options: AnalogSensorServerOptions = {
    readingValues: [400],
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
const soundLevel: AnalogSensorServerOptions = {
    readingValues: [0],
    intensityValues: [false],
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

/**
 * A factory for instantiation a simulated service server
 * @category Servers
 */
export interface ServiceProviderDefinition {
    /**
     * Name of the simulated device
     */
    name: string
    /**
     * List of service classes hosted by the provider
     */
    serviceClasses: number[]
    /**
     * Factory handler to instantiate simulated servers
     */
    services: () => JDServiceServer[]
    /**
     * Indicates if the simulated device should support resetId
     */
    resetIn?: boolean
    /**
     * Custom factory to wrap the services into a service provider
     */
    factory?: (services: JDServiceServer[]) => JDServiceProvider

    /**
     * Additional service options
     */
    serviceOptions?: ServiceProviderOptions[]
}

let _providerDefinitions: ServiceProviderDefinition[]
function initProviders() {
    return (_providerDefinitions =
        _providerDefinitions ||
        [
            <ServiceProviderDefinition>{
                name: "7-segment (4 segments)",
                serviceClasses: [SRV_SEVEN_SEGMENT_DISPLAY],
                services: () => [
                    new JDServiceServer(SRV_SEVEN_SEGMENT_DISPLAY, {
                        intensityValues: [0xffff],
                        valueValues: [fromHex("00000000")],
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
                        valueValues: [fromHex("0000000000000000")],
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
                services: () => [new AccelerometerServer()],
            },
            {
                name: "water acidity (pH)",
                serviceClasses: [SRV_ACIDITY],
                services: () => [
                    new AnalogSensorServer(SRV_ACIDITY, {
                        minReading: 2.5,
                        maxReading: 10,
                        readingValues: [7],
                        readingError: [0.1],
                        readingResolution: 0.1,
                    }),
                ],
            },
            {
                name: "barometer",
                serviceClasses: [SRV_AIR_PRESSURE],
                services: () => [
                    new AnalogSensorServer(SRV_AIR_PRESSURE, barometerOptions),
                ],
            },
            {
                name: "bitradio",
                serviceClasses: [SRV_BIT_RADIO],
                services: () => [new BitRadioServer()],
            },
            {
                name: "Braille display (4 patterns)",
                serviceClasses: [SRV_BRAILLE_DISPLAY],
                services: () => [
                    new BrailleDisplayServer({
                        patterns: "⠃",
                        length: 4,
                    }),
                ],
            },
            {
                name: "Braille display (16 patterns)",
                serviceClasses: [SRV_BRAILLE_DISPLAY],
                services: () => [
                    new BrailleDisplayServer({
                        patterns: "⠃",
                        length: 16,
                    }),
                ],
            },
            {
                name: "Braille display (32 patterns)",
                serviceClasses: [SRV_BRAILLE_DISPLAY],
                services: () => [
                    new BrailleDisplayServer({
                        patterns: "⠃",
                        length: 32,
                    }),
                ],
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
                serviceClasses: [SRV_BUTTON],
                services: () => {
                    const button = new ButtonServer()
                    const config = new CapacitiveButtonServer()
                    button.threshold = config.threshold
                    return [button, config]
                },
            },
            {
                name: "capacitive button (6x)",
                serviceClasses: [SRV_BUTTON],
                services: () =>
                    Array(6)
                        .fill(0)
                        .map((_, i) => new ButtonServer(`C${i}`, true)),
            },
            {
                name: "capacitive button (12x)",
                serviceClasses: [SRV_BUTTON],
                services: () =>
                    Array(12)
                        .fill(0)
                        .map((_, i) => new ButtonServer(`C${i}`, true)),
            },
            {
                name: "character screen (LDC, 16x2)",
                serviceClasses: [SRV_CHARACTER_SCREEN],
                services: () => [
                    new CharacterScreenServer({ message: "hello\nworld!" }),
                ],
            },
            <ServiceProviderDefinition>{
                name: "character screen (OLED, 32x8, RTL)",
                serviceClasses: [SRV_CHARACTER_SCREEN],
                services: () => [
                    new CharacterScreenServer({
                        message: "hello\nworld!",
                    }),
                ],
                serviceOptions: [
                    {
                        serviceClass: SRV_CHARACTER_SCREEN,
                        constants: {
                            columns: 32,
                            rows: 9,
                            variant: CharacterScreenVariant.OLED,
                            textDirection:
                                CharacterScreenTextDirection.RightToLeft,
                        },
                    },
                ],
            },
            {
                name: "color",
                serviceClasses: [SRV_COLOR],
                services: () => [
                    new SensorServer<[number, number, number]>(SRV_COLOR, {
                        readingValues: [0.5, 0, 0.5],
                        preferredStreamingInterval: 1000,
                    }),
                ],
            },
            {
                name: "compass",
                serviceClasses: [SRV_COMPASS],
                services: () => [new CompassServer()],
            },
            {
                name: "DC current/voltage measurement",
                serviceClasses: [
                    SRV_DC_CURRENT_MEASUREMENT,
                    SRV_DC_VOLTAGE_MEASUREMENT,
                ],
                services: () => [
                    new AnalogSensorServer(SRV_DC_CURRENT_MEASUREMENT, {
                        readingValues: [0.001],
                        readingResolution: 0.001,
                        streamingInterval: 100,
                        minReading: 0,
                        maxReading: 1,
                        registerValues: [
                            {
                                code: DcCurrentMeasurementReg.MeasurementName,
                                values: ["amp"],
                            },
                        ],
                    }),
                    new AnalogSensorServer(SRV_DC_VOLTAGE_MEASUREMENT, {
                        readingValues: [5],
                        streamingInterval: 100,
                        readingResolution: 0.001,
                        minReading: 0,
                        maxReading: 7,
                        registerValues: [
                            {
                                code: DcVoltageMeasurementReg.MeasurementName,
                                values: ["volt"],
                            },
                            {
                                code: DcVoltageMeasurementReg.MeasurementType,
                                values: [
                                    DcVoltageMeasurementVoltageMeasurementType.Absolute,
                                ],
                            },
                        ],
                    }),
                ],
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
                services: () => [
                    new AnalogSensorServer(SRV_E_CO2, eCO2Options),
                ],
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
                serviceClasses: [SRV_E_CO2, SRV_HUMIDITY, SRV_TEMPERATURE],
                services: () => [
                    new AnalogSensorServer(SRV_E_CO2, CO2Options),
                    new AnalogSensorServer(
                        SRV_HUMIDITY,
                        outdoorHumidityOptions
                    ),
                    new AnalogSensorServer(
                        SRV_TEMPERATURE,
                        indoorThermometerOptions
                    ),
                ],
            },
            {
                name: "flex sensor",
                serviceClasses: [SRV_FLEX],
                services: () => [
                    new AnalogSensorServer(SRV_FLEX, {
                        readingValues: [0.5],
                    }),
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
                services: () => [
                    new AnalogSensorServer(
                        SRV_HUMIDITY,
                        outdoorHumidityOptions
                    ),
                ],
            },
            {
                name: "humidity + temperature",
                serviceClasses: [SRV_HUMIDITY, SRV_TEMPERATURE],
                services: () => [
                    new AnalogSensorServer(
                        SRV_TEMPERATURE,
                        outdoorThermometerOptions
                    ),
                    new AnalogSensorServer(
                        SRV_HUMIDITY,
                        outdoorHumidityOptions
                    ),
                ],
            },
            {
                name: "humidity + temperature + barometer",
                serviceClasses: [
                    SRV_HUMIDITY,
                    SRV_TEMPERATURE,
                    SRV_AIR_PRESSURE,
                ],
                services: () => [
                    new AnalogSensorServer(
                        SRV_TEMPERATURE,
                        outdoorThermometerOptions
                    ),
                    new AnalogSensorServer(
                        SRV_HUMIDITY,
                        outdoorHumidityOptions
                    ),
                    new AnalogSensorServer(SRV_AIR_PRESSURE, barometerOptions),
                ],
            },
            {
                name: "HID keyboard (simulated)",
                serviceClasses: [SRV_HID_KEYBOARD],
                services: () => [new HIDKeyboardServer()],
            },
            {
                name: "HID joystick (simulated)",
                serviceClasses: [SRV_HID_JOYSTICK],
                services: () => [new HIDJoystickServer()],
            },
            {
                name: "HID mouse (simulated)",
                serviceClasses: [SRV_HID_MOUSE],
                services: () => [new HIDMouseServer()],
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
                name: "gamepad (stick + A + B)",
                serviceClasses: [SRV_GAMEPAD],
                services: () => [
                    new GamepadServer({
                        variant: GamepadVariant.Thumb,
                        buttonsAvailable: GamepadButtons.A | GamepadButtons.B,
                    }),
                ],
            },
            {
                name: "gamepad (stick)",
                serviceClasses: [SRV_GAMEPAD],
                services: () => [
                    new GamepadServer({
                        variant: GamepadVariant.Thumb,
                    }),
                ],
            },
            {
                name: "gamepad (stick+A)",
                serviceClasses: [SRV_GAMEPAD],
                services: () => [
                    new GamepadServer({
                        variant: GamepadVariant.Thumb,
                        buttonsAvailable: GamepadButtons.A,
                    }),
                ],
            },
            {
                name: "gamepad (Dpad + arcade buttons)",
                serviceClasses: [SRV_GAMEPAD],
                services: () => [
                    new GamepadServer({
                        variant: GamepadVariant.Gamepad,
                        buttonsAvailable: GAMEPAD_ARCADE_BUTTONS,
                    }),
                ],
            },
            {
                name: "gamepad (only DPad+A/B)",
                serviceClasses: [SRV_GAMEPAD],
                services: () => [
                    new GamepadServer({
                        variant: GamepadVariant.Gamepad,
                        buttonsAvailable: GAMEPAD_DPAD_AB_BUTTONS,
                    }),
                ],
            },
            {
                name: "gamepad (Dpad + all buttons)",
                serviceClasses: [SRV_GAMEPAD],
                services: () => [
                    new GamepadServer({
                        variant: GamepadVariant.Gamepad,
                        buttonsAvailable:
                            GAMEPAD_ARCADE_BUTTONS |
                            GamepadButtons.X |
                            GamepadButtons.Y,
                    }),
                ],
            },
            {
                name: "geolocation (satelitte navigation)",
                serviceClasses: [SRV_SAT_NAV],
                services: () => [new SatNavServer()],
            },
            {
                name: "LED ring 8 pixels",
                serviceClasses: [SRV_LED],
                services: () => [
                    new LedServer({
                        numPixels: 8,
                        variant: LedVariant.Ring,
                    }),
                ],
            },
            {
                name: "LED ring 10 pixels",
                serviceClasses: [SRV_LED],
                services: () => [
                    new LedServer({
                        numPixels: 10,
                        variant: LedVariant.Ring,
                    }),
                ],
            },
            {
                name: "LED ring 12 pixels",
                serviceClasses: [SRV_LED],
                services: () => [
                    new LedServer({
                        numPixels: 12,
                        variant: LedVariant.Ring,
                    }),
                ],
            },
            {
                name: "LED ring 16 pixels",
                serviceClasses: [SRV_LED],
                services: () => [
                    new LedServer({
                        numPixels: 16,
                        variant: LedVariant.Ring,
                    }),
                ],
            },
            {
                name: "LED ring 24 pixels",
                serviceClasses: [SRV_LED],
                services: () => [
                    new LedServer({
                        numPixels: 24,
                        variant: LedVariant.Ring,
                    }),
                ],
            },
            {
                name: "LED jewel 7 pixels",
                serviceClasses: [SRV_LED],
                services: () => [
                    new LedServer({
                        numPixels: 7,
                        variant: LedVariant.Jewel,
                    }),
                ],
            },
            {
                name: "LED stick 8",
                serviceClasses: [SRV_LED],
                services: () => [
                    new LedServer({
                        numPixels: 8,
                        variant: LedVariant.Stick,
                    }),
                ],
            },
            {
                name: "LED single",
                serviceClasses: [SRV_LED],
                services: () => [
                    new LedServer({
                        numPixels: 1,
                        ledsPerPixel: 1,
                        color: [255, 0, 0],
                        variant: LedVariant.Stick,
                    }),
                ],
            },
            {
                name: "LED single with 5 leds",
                serviceClasses: [SRV_LED],
                services: () => [
                    new LedServer({
                        numPixels: 1,
                        waveLength: 450,
                        ledsPerPixel: 5,
                        color: [0, 0, 255],
                        variant: LedVariant.Stick,
                    }),
                ],
            },
            {
                name: "LED matrix (5x5 micro:bit)",
                serviceClasses: [SRV_DOT_MATRIX],
                services: () => [
                    new DotMatrixServer(5, 5, {
                        brightness: 128,
                        variant: DotMatrixVariant.LED,
                    }),
                ],
            },
            {
                name: "LED matrix (8x8)",
                serviceClasses: [SRV_DOT_MATRIX],
                services: () => [
                    new DotMatrixServer(8, 8, {
                        brightness: 128,
                        variant: DotMatrixVariant.LED,
                    }),
                ],
            },
            {
                name: "LED matrix (11x7)",
                serviceClasses: [SRV_DOT_MATRIX],
                services: () => [
                    new DotMatrixServer(11, 7, {
                        brightness: 128,
                        variant: DotMatrixVariant.LED,
                    }),
                ],
            },
            {
                name: "Braille matrix (8x4)",
                serviceClasses: [SRV_DOT_MATRIX],
                services: () => [
                    new DotMatrixServer(8, 4, {
                        variant: DotMatrixVariant.Braille,
                    }),
                ],
            },
            {
                name: "LED pixel strip 30",
                serviceClasses: [SRV_LED_STRIP],
                services: () => [
                    new LedStripServer({
                        numPixels: 60,
                        maxPower: 1000,
                        variant: LedStripVariant.Strip,
                    }),
                ],
            },
            {
                name: "LED pixel strip 60",
                serviceClasses: [SRV_LED_STRIP],
                services: () => [
                    new LedStripServer({
                        numPixels: 60,
                        maxPower: 2000,
                        variant: LedStripVariant.Strip,
                    }),
                ],
            },
            {
                name: "LED pixel strip 150",
                serviceClasses: [SRV_LED_STRIP],
                services: () => [
                    new LedStripServer({
                        numPixels: 150,
                        maxPower: 5000,
                        variant: LedStripVariant.Strip,
                    }),
                ],
            },
            {
                name: "LED pixel strip 300",
                serviceClasses: [SRV_LED_STRIP],
                services: () => [
                    new LedStripServer({
                        numPixels: 300,
                        maxPower: 5000,
                        variant: LedStripVariant.Strip,
                    }),
                ],
            },
            {
                name: "LED pixel matrix (4x4)",
                serviceClasses: [SRV_LED],
                services: () => [
                    new LedServer({
                        numPixels: 16,
                        variant: LedVariant.Matrix,
                    }),
                ],
            },
            {
                name: "LED pixel matrix (8x8)",
                serviceClasses: [SRV_LED],
                services: () => [
                    new LedServer({
                        numPixels: 64,
                        variant: LedVariant.Matrix,
                        numColumns: 8,
                    }),
                ],
            },
            {
                name: "LED pixel matrix (16x4)",
                serviceClasses: [SRV_LED],
                services: () => [
                    new LedServer({
                        numPixels: 64,
                        numColumns: 16,
                        variant: LedVariant.Matrix,
                    }),
                ],
            },
            {
                name: "light bulb",
                serviceClasses: [SRV_LIGHT_BULB],
                services: () => [
                    new JDServiceServer(SRV_LIGHT_BULB, {
                        intensityValues: [0],
                        isActive: values => !!values?.[0],
                        intensityProcessor: (values: [number]) => {
                            const newValues = [values[0] > 0 ? 1 : 0]
                            return newValues
                        },
                        registerValues: [
                            {
                                code: LightBulbReg.Dimmable,
                                values: [false],
                            },
                        ],
                    }),
                ],
            },
            {
                name: "light bulb (dimmeable)",
                serviceClasses: [SRV_LIGHT_BULB],
                services: () => [
                    new JDServiceServer(SRV_LIGHT_BULB, {
                        intensityValues: [0],
                        isActive: values => !!values?.[0],
                        registerValues: [
                            {
                                code: LightBulbReg.Dimmable,
                                values: [true],
                            },
                        ],
                    }),
                ],
            },
            {
                name: "light level (solar)",
                serviceClasses: [SRV_LIGHT_LEVEL],
                services: () => [
                    new SensorServer(SRV_LIGHT_LEVEL, {
                        readingValues: [0.5],
                        variant: LightLevelVariant.PhotoResistor,
                    }),
                ],
            },
            {
                name: "line sensor (digital)",
                serviceClasses: [SRV_REFLECTED_LIGHT],
                services: () => [new ReflectedLightServer()],
            },
            {
                name: "line sensor (2x digital)",
                serviceClasses: [SRV_REFLECTED_LIGHT],
                services: () => [
                    new ReflectedLightServer(),
                    new ReflectedLightServer(),
                ],
            },
            {
                name: "line sensor (3x digital)",
                serviceClasses: [SRV_REFLECTED_LIGHT],
                services: () => [
                    new ReflectedLightServer(),
                    new ReflectedLightServer(),
                    new ReflectedLightServer(),
                ],
            },
            {
                name: "line sensor (analog)",
                serviceClasses: [SRV_REFLECTED_LIGHT],
                services: () => [
                    new ReflectedLightServer({
                        variant: ReflectedLightVariant.InfraredAnalog,
                    }),
                ],
            },
            <ServiceProviderDefinition>{
                name: "magnetic field level",
                serviceClasses: [SRV_MAGNETIC_FIELD_LEVEL],
                services: () => [
                    new MagneticFieldLevelServer({
                        variant: MagneticFieldLevelVariant.AnalogNS,
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
                resetIn: true,
            },
            {
                name: "motor (dual)",
                serviceClasses: [SRV_DUAL_MOTORS],
                services: () => [new DualMotorsServer()],
                resetIn: true,
            },
            {
                name: "planar position",
                serviceClasses: [SRV_PLANAR_POSITION],
                services: () => [new PlanarPositionServer()],
            },
            Flags.diagnostics && {
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
                name: "power supply (5v)",
                serviceClasses: [SRV_POWER_SUPPLY],
                services: () => [
                    new PowerSupplyServer({
                        outputVoltage: 1000,
                        minVoltage: 0,
                        maxVoltage: 5000,
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
                        isActive: values => !!values?.[0],
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
                                    isActive: values => !!values?.[0],
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
                services: () => [new RotaryEncoderServer(), new ButtonServer()],
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
                name: "serial (115200/8N1)",
                serviceClasses: [SRV_SERIAL],
                services: () => [new SerialServer()],
            },
            {
                name: "servo",
                serviceClasses: [SRV_SERVO],
                services: () => [new ServoServer(microServoOptions)],
                resetIn: true,
            },
            {
                name: "servo (270°)",
                serviceClasses: [SRV_SERVO],
                services: () => [new ServoServer(microServo270Options)],
                resetIn: true,
            },
            {
                name: "servo (360°)",
                serviceClasses: [SRV_SERVO],
                services: () => [new ServoServer(microServo360Options)],
                resetIn: true,
            },
            {
                name: "servo x 2",
                serviceClasses: [SRV_SERVO],
                resetIn: true,
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
                resetIn: true,
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
                resetIn: true,
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
                resetIn: true,
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
                name: "servo (continuous)",
                serviceClasses: [SRV_SERVO],
                services: () => [new ServoServer(microServoContinuousOptions)],
                resetIn: true,
            },
            {
                name: "servo (continuous) x2",
                serviceClasses: [SRV_SERVO],
                services: () =>
                    Array(2)
                        .fill(0)
                        .map(
                            (_, i) =>
                                new ServoServer({
                                    ...microServoContinuousOptions,
                                    instanceName: `S${i}`,
                                })
                        ),
                resetIn: true,
            },
            {
                name: "settings",
                serviceClasses: [SRV_SETTINGS],
                services: () => [new SettingsServer()],
            },
            {
                name: "slider (potentiometer)",
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
                        readingError: [0.05],
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
                name: "sound player (micro:bit V2 sounds)",
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
                    }),
                ],
            },
            {
                name: "thermometer (outdoor)",
                serviceClasses: [SRV_TEMPERATURE],
                services: () => [
                    new AnalogSensorServer(
                        SRV_TEMPERATURE,
                        outdoorThermometerOptions
                    ),
                ],
            },
            {
                name: "thermometer (soil)",
                serviceClasses: [SRV_TEMPERATURE],
                services: () => [
                    new AnalogSensorServer(
                        SRV_TEMPERATURE,
                        soilThermometerOptions
                    ),
                ],
            },
            {
                name: "thermometer (medical)",
                serviceClasses: [SRV_TEMPERATURE],
                services: () => [
                    new AnalogSensorServer(
                        SRV_TEMPERATURE,
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
                        .map(() => new TrafficLightServer()),
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
                        minReading: 0,
                        maxReading: 11,
                        streamingInterval: 1000,
                    }),
                ],
            },
            {
                name: "vibration motor",
                serviceClasses: [SRV_VIBRATION_MOTOR],
                services: () => [new VibrationMotorServer()],
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
                name: "water pump (relay)",
                serviceClasses: [SRV_RELAY],
                services: () => [
                    new JDServiceServer(SRV_RELAY, {
                        intensityValues: [false],
                        isActive: values => !!values?.[0],
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
                serviceClasses: [
                    SRV_WIND_SPEED,
                    SRV_WIND_DIRECTION,
                    SRV_RAIN_GAUGE,
                ],
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
                name: "chassis (motor x 2 + sonar + light)",
                serviceClasses: [SRV_DISTANCE, SRV_LED, SRV_MOTOR],
                services: () => [
                    new MotorServer("L"),
                    new MotorServer("R"),
                    new AnalogSensorServer(SRV_DISTANCE, sonarOptions),
                    new LedServer({
                        numPixels: 5,
                        variant: LedVariant.Stick,
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
                name: "micro:bit V2",
                serviceClasses: [
                    SRV_DOT_MATRIX,
                    SRV_BUTTON,
                    SRV_ACCELEROMETER,
                    SRV_SOUND_LEVEL,
                    SRV_LIGHT_LEVEL,
                    SRV_BUZZER,
                    SRV_SOUND_PLAYER,
                ],
                services: () => [
                    new DotMatrixServer(5, 5),
                    new ButtonServer("A"),
                    new ButtonServer("B"),
                    new SensorServer<[number, number, number]>(
                        SRV_ACCELEROMETER,
                        {
                            readingValues: [
                                0.5,
                                0.5,
                                -(1 - (0.5 * 0.5 + 0.5 * 0.5)),
                            ],
                        }
                    ),
                    new AnalogSensorServer(SRV_SOUND_LEVEL, soundLevel),
                    new SensorServer(SRV_LIGHT_LEVEL, {
                        readingValues: [0.5],
                        variant: LightLevelVariant.ReverseBiasedLED,
                    }),
                    new BuzzerServer(),
                    new SoundPlayerServer(microbitSounds),
                ],
            },
            <ServiceProviderDefinition>{
                name: "power + humidity",
                serviceClasses: [SRV_POWER, SRV_HUMIDITY],
                services: () => [
                    new PowerServer(),
                    new AnalogSensorServer(
                        SRV_HUMIDITY,
                        outdoorHumidityOptions
                    ),
                ],
                factory: services => {
                    const dev = new JDServerServiceProvider("power+humidity", [
                        services[0],
                    ])
                    const pwr = dev.service(1) as PowerServer
                    pwr.allowed.on(CHANGE, () => {
                        const allowed = !!pwr.allowed.values()[0]
                        console.debug(`power: ${allowed ? "on" : "off"}`)
                        if (allowed)
                            // power + rest
                            dev.updateServices(services)
                        // power only
                        else dev.updateServices([services[0]])
                    })
                    return dev
                },
            },
            {
                name: "Cloud adapter (simulator)",
                serviceClasses: [SRV_CLOUD_ADAPTER],
                services: () => [
                    new CloudAdapterServer({
                        connectionName: "simulated",
                    }),
                ],
            },
            {
                name: "ROS (simulator)",
                serviceClasses: [SRV_ROS],
                services: () => [new RosServer()],
            },
            {
                name: "Display 128x64 monochrome (1bpp)",
                serviceClasses: [SRV_INDEXED_SCREEN],
                services: () => [
                    new IndexedScreenServer({
                        width: 128,
                        height: 64,
                        bitsPerPixel: 1,
                        palette: [0x000000, 0xffffff],
                    }),
                ],
            },
            {
                name: "Display 128x128 16colors (4bpp)",
                serviceClasses: [SRV_INDEXED_SCREEN],
                services: () => [
                    new IndexedScreenServer({
                        width: 128,
                        height: 128,
                        bitsPerPixel: 4,
                        palette: [
                            0x000000, 0xffffff, 0xff2121, 0xff93c4, 0xff8135,
                            0xfff609, 0x249ca3, 0x78dc52, 0x003fad, 0x87f2ff,
                            0x8e2ec4, 0xa4839f, 0x5c406c, 0xe5cdc4, 0x91463d,
                            0x000000,
                        ],
                    }),
                ],
            },
            Flags.diagnostics
                ? {
                      name: "WiFi (virtual, no ap)",
                      serviceClasses: [SRV_WIFI],
                      services: () => [new WifiServer()],
                  }
                : undefined,
            Flags.diagnostics
                ? {
                      name: "WiFi (virtual, 1 AP)",
                      serviceClasses: [SRV_WIFI],
                      services: () => [
                          new WifiServer({
                              scanResults: [
                                  {
                                      ssid: "HOME",
                                      bssid: new Uint8Array(0),
                                      rssi: -42,
                                      channel: 10,
                                      flags:
                                          WifiAPFlags.WPS |
                                          WifiAPFlags.IEEE_802_11B,
                                  },
                              ],
                          }),
                      ],
                  }
                : undefined,
            Flags.diagnostics
                ? {
                      name: "WiFi (virtual, 1 network)",
                      serviceClasses: [SRV_WIFI],
                      services: () => [
                          new WifiServer({
                              scanResults: [
                                  {
                                      ssid: "HOME",
                                      bssid: new Uint8Array(0),
                                      rssi: -42,
                                      channel: 10,
                                      flags:
                                          WifiAPFlags.WPS |
                                          WifiAPFlags.IEEE_802_11B,
                                  },
                              ],
                              knownNetworks: [
                                  {
                                      ssid: "HOME",
                                      password: "home",
                                      priority: 0,
                                      flags:
                                          WifiAPFlags.WPS |
                                          WifiAPFlags.IEEE_802_11B,
                                  },
                              ],
                          }),
                      ],
                  }
                : undefined,
        ].filter(s => !!s))
}

/**
 * Gets the list of simulated service providers
 * @category Servers
 */
export function serviceProviderDefinitions() {
    return initProviders().slice(0)
}

/**
 * Adds a new service provider definition
 * @param def
 */
export function addServiceProviderDefinition(def: ServiceProviderDefinition) {
    const providers = initProviders()
    if (!providers.find(p => p.name === def.name)) providers.push(def)
}

function fingerPrint() {
    try {
        if (typeof self !== "undefined" && self.localStorage) {
            const key = "jacdac_device_fingerprint"
            const f =
                self.localStorage[key] ||
                (self.localStorage[key] = randomDeviceId())
            return f
        }
    } catch (e) {
        return ""
    }
}

function stableSimulatorDeviceId(
    bus: JDBus,
    template: string,
    salt: string
): string {
    const fg = fingerPrint()
    const others = bus.serviceProviders().filter(sp => sp.template === template)
    const word0 = hash(stringToUint8Array(salt + template + others.length), 32)
    const word1 = hash(
        stringToUint8Array(salt + fg + template + others.length + 1),
        32
    )
    const id = toFullHex([word0, word1])
    return id.slice(2)
}

export interface ServiceProviderOptions {
    serviceClass: number
    serviceOffset?: number
    constants: Record<string, PackedSimpleValue>
}

function applyServiceOptions(
    services: JDServiceServer[],
    serviceOptions: ServiceProviderOptions[]
) {
    serviceOptions?.forEach(({ serviceClass, serviceOffset, constants }) => {
        const srvs = services.filter(srv => srv.serviceClass === serviceClass)
        const service = srvs[serviceOffset || 0]
        if (!service) {
            console.warn(
                `service provider: service 0x${serviceClass.toString(
                    16
                )} not found at offset ${serviceOffset || 0}`,
                { srvs }
            )
        } else {
            const { specification } = service
            Object.entries(constants).forEach(([name, value]) => {
                const spec = specification.packets.find(
                    pkt => isConstRegister(pkt) && pkt.name === name
                )
                if (!spec)
                    console.warn(
                        `service provider: unknown register ${specification.name}.${name}`
                    )
                else {
                    const reg = service.register(spec.identifier)
                    if (!reg) service.addRegister(spec.identifier, [value])
                    else reg.setValues([value])
                }
            })
        }
    })
}

/**
 * Instantiates a new service provider instance and adds it to the bus
 * @category Servers
 */
export function addServiceProvider(
    bus: JDBus,
    definition: ServiceProviderDefinition,
    serviceOptions?: ServiceProviderOptions[]
) {
    const services = definition.services()
    applyServiceOptions(services, definition.serviceOptions)
    applyServiceOptions(services, serviceOptions)
    services.forEach(srv => srv.lock())
    const salt = bus.serviceProviderIdSalt
    const deviceId = stableSimulatorDeviceId(bus, definition.name, salt)
    const options = {
        resetIn: definition.resetIn,
        deviceId,
        deviceDescription: definition.name,
    }
    const d =
        definition.factory?.(services) ||
        new JDServerServiceProvider(definition.name, services, options)
    bus.addServiceProvider(d)
    return d
}

/**
 * Adds a single server device on the bus.
 * @param bus
 * @param name
 * @param server
 * @param serviceOptions
 * @returns
 */
export function addServer(
    bus: JDBus,
    name: string,
    server: JDServiceServer,
    serviceOptions?: ServiceProviderOptions[]
) {
    const services = [server]
    return addServiceProvider(
        bus,
        {
            name,
            serviceClasses: services.map(srv => srv.serviceClass),
            services: () => services,
        },
        serviceOptions
    )
}

/**
 * Finds the first service provider that supports the given service class
 * @category Servers
 */
export function serviceProviderDefinitionFromServiceClass(
    serviceClass: number
) {
    return initProviders().find(
        provider =>
            provider.serviceClasses.length === 1 &&
            provider.serviceClasses[0] === serviceClass
    )
}

function syntheticServiceProvider(
    bus: JDBus,
    serviceClass: number
): ServiceProviderDefinition {
    const specification = serviceSpecificationFromClassIdentifier(serviceClass)
    if (!specification) return undefined

    const { name } = specification

    let server: JDServiceServer
    if (isSensor(specification)) {
        const reading = specification.packets.find(isReading)
        if (reading.fields.length === 1 && isNumericType(reading.fields[0])) {
            const field = reading.fields[0]
            const { min, max, scale = 1, defl } = genFieldInfo(reading, field)
            const value = typeof defl === "number" ? defl : (max - min) / 2
            server = new AnalogSensorServer(serviceClass, {
                readingValues: [value / scale],
                minReading: min / scale,
                maxReading: max / scale,
            })
        }
    } else if (isActuator(specification)) {
        const intensity = 0
        const valueReg = specification.packets.find(
            pkt => pkt.identifier === SystemReg.Value
        )
        const {
            min,
            max,
            scale = 1,
            defl,
        } = (valueReg && genFieldInfo(valueReg, valueReg.fields[0])) || {}
        const value = typeof defl === "number" ? defl : (max - min) / 2
        server = new JDServiceServer(serviceClass, {
            intensityValues: [intensity],
            valueValues: !isNaN(value) ? [value / scale] : undefined,
        })
    }

    return (
        server && {
            name,
            serviceClasses: [serviceClass],
            services: () => [server],
        }
    )
}

/**
 * Starts a service provider that hosts the given service class.
 * @category Servers
 */
export function startServiceProviderFromServiceClass(
    bus: JDBus,
    serviceClass: number
) {
    const provider =
        serviceProviderDefinitionFromServiceClass(serviceClass) ||
        syntheticServiceProvider(bus, serviceClass)
    return provider ? addServiceProvider(bus, provider) : undefined
}
