// TODO:
// - play sound
// - cap touch (logo)
// - temperature
// - compass
// - edge connector (cap touch)

function startAll() {
    let accel = new microbit.Accelerometer();
    let buttonA = new microbit.MButton("buttonA", Button.A);
    let buttonB = new microbit.MButton("buttonB", Button.B);
    let buttonAB = new microbit.MButton("buttonAB", Button.AB);
    let soundLevel = new microbit.SoundLevel();
    let lightLevel = new microbit.LightLevel();
    let screen = new microbit.Screen();
    accel.start();
    buttonA.start();
    buttonB.start();
    buttonAB.start();
    soundLevel.start();
    lightLevel.start();
    screen.start();
}
startAll();
