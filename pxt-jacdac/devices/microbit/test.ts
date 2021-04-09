// TODO:
// - cap touch (logo)
// - edge connector (cap touch)

function startAll() {

    microbit.accelerometerServer.start()
    microbit.buttonA.start()
    microbit.buttonB.start()
    microbit.buttonAB.start()
    microbit.soundLevelServer.start()
    microbit.lightLevelServer.start()
    microbit.screenServer.start()
    microbit.thermometerServer.start()
    microbit.compassServer.start()
    microbit.radioServer.start()
    //microbit.soundPlayerServer.start()
    microbit.buzzerServer.start()
}
startAll()
