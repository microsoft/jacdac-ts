// TODO:
// - cap touch (logo)
// - edge connector (cap touch)

function startAll() {

    microbit.accelerometerServer.start()
    microbit.buttonA.start()
    microbit.buttonB.start()
    microbit.buttonAB.start()
    microbit.buttonLogo.start()
    microbit.soundLevelServer.start()
    microbit.lightLevelServer.start()
    microbit.screenServer.start()
    microbit.thermometerServer.start()
    // calibration "kills" jacdac
    // microbit.compassServer.start()
    microbit.radioServer.start()
    microbit.buzzerServer.start()
    microbit.soundPlayerServer.start()
}
startAll()
