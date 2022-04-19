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
    //    SRV_AZURE_IOT_HUB,
    SRV_AZURE_IOT_HUB_HEALTH,
    DotMatrixVariant,
    SRV_FLEX,
    SRV_WIFI,
    SRV_LIGHT_BULB,
    LightBulbReg,
    WifiAPFlags,
    LedDisplayVariant,
    SRV_LED_DISPLAY,
    SRV_POWER_SUPPLY,
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
import { LEDServer } from "./ledserver"
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
import { AzureIoTHubHealthServer } from "./azureiothubhealthserver"
import { JDServiceProvider } from "../jdom/servers/serviceprovider"
import { VibrationMotorServer } from "./vibrationmotorserver"
import { WifiServer } from "./wifiserver"
import { AccelerometerServer } from "./accelerometerserver"
import { BrailleDisplayServer } from "./brailledisplayserver"
import { Flags } from "../jdom/flags"
import { LedDisplayServer } from "./leddisplayserver"
import { PowerSupplyServer } from "./powersupplyserver"
import { HIDJoystickServer } from "./hidjoystickserver"

const indoorThermometerOptions: AnalogSensorServerOptions = {
    instanceName: "indoor",
    readingValues: [21.5],
    streamingInterval: 1000,
    minReading: -5,
    maxReading: 50,
    readingError: [0.25],
    variant: TemperatureVariant.Indoor,
}
const outdoorThermometerOptions: AnalogSensorServerOptions = {
    instanceName: "temperature",
    readingValues: [21.5],
    streamingInterval: 1000,
    minReading: -40,
    maxReading: 120,
    readingError: [0.25],
    variant: TemperatureVariant.Outdoor,
}
const outdoorHumidityOptions: AnalogSensorServerOptions = {
    instanceName: "humidity",
    streamingInterval: 1000,
    readingValues: [40],
    readingError: [0.1],
    minReading: 10,
    maxReading: 99,
}
const soilThermometerOptions: AnalogSensorServerOptions = {
    instanceName: "temperature",
    readingValues: [15],
    streamingInterval: 1000,
    minReading: -55,
    maxReading: 125,
    readingError: [0.5],
    variant: TemperatureVariant.Outdoor,
}
const medicalThermometerOptions: AnalogSensorServerOptions = {
    instanceName: "medical",
    readingValues: [37.5],
    streamingInterval: 1000,
    minReading: 35,
    maxReading: 42,
    readingError: [0.5],
    variant: TemperatureVariant.Body,
}
const barometerOptions: AnalogSensorServerOptions = {
    instanceName: "pressure",
    readingValues: [1013],
    readingError: [0.4],
    streamingInterval: 1000,
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
    minAngle: -90,
    maxAngle: 90,
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
const soundLevel: AnalogSensorServerOptions = {
    readingValues: [0],
    inactiveThreshold: 0.1,
    activeThreshold: 0.7,
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
                name: "gamepad (Dpad + all buttons)",
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
                name: "RGB LED (RGB through hole)",
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
                name: "LED (5x blue through hole)",
                serviceClasses: [SRV_LED],
                services: () => [
                    new LEDServer({
                        variant: LedVariant.ThroughHole,
                        waveLength: 450,
                        ledCount: 5,
                        color: [0, 0, 255],
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
                name: "LED pixel ring 10",
                serviceClasses: [SRV_LED_DISPLAY],
                services: () => [
                    new LedDisplayServer({
                        numPixels: 10,
                        variant: LedDisplayVariant.Ring,
                    }),
                ],
            },
            {
                name: "LED pixel ring 12",
                serviceClasses: [SRV_LED_DISPLAY],
                services: () => [
                    new LedDisplayServer({
                        numPixels: 12,
                        variant: LedDisplayVariant.Ring,
                    }),
                ],
            },
            {
                name: "LED pixel ring 16",
                serviceClasses: [SRV_LED_DISPLAY],
                services: () => [
                    new LedDisplayServer({
                        numPixels: 16,
                        variant: LedDisplayVariant.Ring,
                    }),
                ],
            },
            {
                name: "LED pixel ring 24",
                serviceClasses: [SRV_LED_DISPLAY],
                services: () => [
                    new LedDisplayServer({
                        numPixels: 24,
                        variant: LedDisplayVariant.Ring,
                    }),
                ],
            },
            {
                name: "LED pixel jewel 7",
                serviceClasses: [SRV_LED_DISPLAY],
                services: () => [
                    new LedDisplayServer({
                        numPixels: 7,
                        variant: LedDisplayVariant.Jewel,
                    }),
                ],
            },
            {
                name: "LED pixel stick 8",
                serviceClasses: [SRV_LED_DISPLAY],
                services: () => [
                    new LedDisplayServer({
                        numPixels: 8,
                        variant: LedDisplayVariant.Stick,
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
                serviceClasses: [SRV_LED_DISPLAY],
                services: () => [
                    new LedDisplayServer({
                        numPixels: 16,
                        variant: LedDisplayVariant.Matrix,
                    }),
                ],
            },
            {
                name: "LED pixel matrix (8x8)",
                serviceClasses: [SRV_LED_DISPLAY],
                services: () => [
                    new LedDisplayServer({
                        numPixels: 64,
                        variant: LedDisplayVariant.Matrix,
                    }),
                ],
            },
            {
                name: "LED pixel matrix (16x4)",
                serviceClasses: [SRV_LED_DISPLAY],
                services: () => [
                    new LedDisplayServer({
                        numPixels: 64,
                        numColumns: 16,
                        variant: LedDisplayVariant.Matrix,
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
                resetIn: true,
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
                serviceClasses: [SRV_DISTANCE, SRV_LED_DISPLAY, SRV_MOTOR],
                services: () => [
                    new MotorServer("L"),
                    new MotorServer("R"),
                    new AnalogSensorServer(SRV_DISTANCE, sonarOptions),
                    new LedDisplayServer({
                        numPixels: 5,
                        variant: LedDisplayVariant.Stick,
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
                    pwr.enabled.on(CHANGE, () => {
                        const enabled = !!pwr.enabled.values()[0]
                        console.debug(`power: ${enabled ? "on" : "off"}`)
                        if (enabled)
                            // power + rest
                            dev.updateServices(services)
                        // power only
                        else dev.updateServices([services[0]])
                    })
                    return dev
                },
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
            Flags.diagnostics
                ? {
                      name: "Azure IoT Hub Health (virtual)",
                      serviceClasses: [SRV_AZURE_IOT_HUB_HEALTH],
                      services: () => [new AzureIoTHubHealthServer()],
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

function stableSimulatorDeviceId(bus: JDBus, template: string): string {
    const others = bus.serviceProviders().filter(sp => sp.template === template)
    const word0 = hash(stringToUint8Array(template + others.length), 32)
    const word1 = hash(stringToUint8Array(template + others.length + 1), 32)
    const id = toFullHex([word0, word1])
    return id.slice(2)
}

/**
 * Instantiates a new service provider instance and adds it to the bus
 * @category Servers
 */
export function addServiceProvider(
    bus: JDBus,
    definition: ServiceProviderDefinition
) {
    const services = definition.services()
    services.forEach(srv => srv.lock())
    const deviceId = stableSimulatorDeviceId(bus, definition.name)
    const options = {
        resetIn: definition.resetIn,
        deviceId,
    }
    const d =
        definition.factory?.(services) ||
        new JDServerServiceProvider(definition.name, services, options)
    bus.addServiceProvider(d)
    return d
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

/**
 * Starts a service provider that hosts the given service class.
 * @category Servers
 */
export function startServiceProviderFromServiceClass(
    bus: JDBus,
    serviceClass: number
) {
    const provider = serviceProviderDefinitionFromServiceClass(serviceClass)
    return addServiceProvider(bus, provider)
}
