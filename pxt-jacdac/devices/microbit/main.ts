namespace servers {
    /**
     * Start all microbit servers
     */
    //% blockId=jacdac_microbit_start_all
    //% block="start all jacdac servers"
    export function startAll() {
        servers.buttonA.start()
        servers.buttonB.start()
        servers.buttonAB.start()
        servers.buttonLogo.start()
        servers.screenServer.start()
        servers.soundLevelServer.start()
        servers.lightLevelServer.start()
        servers.thermometerServer.start()
        servers.accelerometerServer.start()
        servers.buzzerServer.start()
        servers.soundPlayerServer.start()
        // calibration "kills" jacdac
        // microbit.compassServer.start()
        servers.radioServer.start()

        control.runInBackground(function () {
            pause(100)
            basic.showAnimation(
                `
            ..... ..##. .###. .###. .###.
            ..... ..... ..##. .###. .###.
            ..... ..... ..... ..##. .###.
            ..... ..... ..... ..... ..##.
            ..... ..... ..... ..... .....
            `
            )
        })
    }
}
