// TODO:
// - cap touch (logo)
// - edge connector (cap touch)

function startAll() {
    const accel = new microbit.Accelerometer();
    const buttonA = new microbit.MButton("buttonA", Button.A);
    const buttonB = new microbit.MButton("buttonB", Button.B);
    const buttonAB = new microbit.MButton("buttonAB", Button.AB);
    const soundLevel = new microbit.SoundLevel();
    const lightLevel = new microbit.LightLevel();
    const screen = new microbit.Screen();
    const thermometer = new microbit.Thermometer()
    const compass = new microbit.Compass()
    const radio = new microbit.Radio()
    //const soundPlayer = new microbit.SoundPlayer()
    const buzzer = new microbit.Buzzer()

    accel.start()
    buttonA.start()
    buttonB.start()
    buttonAB.start()
    soundLevel.start()
    lightLevel.start()
    screen.start()
    thermometer.start()
    compass.start()
    radio.start()
    //soundPlayer.start()
    buzzer.start()
}
startAll()
