// TODO:
// - cap touch (logo)
// - edge connector (cap touch)

function startAll() {

    microbit.buttonA.start()
    microbit.buttonB.start()
    microbit.buttonAB.start()
    microbit.buttonLogo.start()
    microbit.screenServer.start()
    microbit.soundLevelServer.start()
    microbit.lightLevelServer.start()
    microbit.thermometerServer.start()
    microbit.accelerometerServer.start()
    microbit.buzzerServer.start()
    microbit.soundPlayerServer.start()
    // calibration "kills" jacdac
    microbit.compassServer.start()
    microbit.radioServer.start()
}
startAll()
