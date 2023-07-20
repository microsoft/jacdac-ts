import { SatNavReg, SRV_SAT_NAV } from "../jdom/constants"
import { JDRegisterServer } from "../jdom/servers/registerserver"
import { SensorServer, SensorServiceOptions } from "./sensorserver"

export type SatNavReadingType = [
    number, // time
    number, // latitude
    number, // longitude
    number, // accuracy
    number, // altitude,
    number, // altitude accuracy
]

export class SatNavServer extends SensorServer<SatNavReadingType> {
    readonly enabled: JDRegisterServer<[boolean]>

    constructor(options?: SensorServiceOptions<SatNavReadingType>) {
        super(
            SRV_SAT_NAV,
            options || {
                streamingInterval: 1000,
            },
        )
        this.enabled = this.addRegister(SatNavReg.Enabled, [false])
    }

    setGeolocationPosition(
        loc: GeolocationPosition,
        skipChangeEvent?: boolean,
    ) {
        const { timestamp, coords } = loc
        const { latitude, longitude, accuracy, altitude, altitudeAccuracy } =
            coords
        this.reading.setValues(
            [
                timestamp,
                latitude,
                longitude,
                accuracy,
                altitude || 0,
                altitudeAccuracy || 0,
            ],
            skipChangeEvent,
        )
    }
}

export function watchLocation(
    server: SatNavServer,
    options?: PositionOptions,
): () => void {
    let id: number = undefined
    const success: PositionCallback = pos => {
        console.log("geo: pos", { id, pos })
        if (id !== undefined) server.setGeolocationPosition(pos)
    }
    const unmount = () => {
        if (id !== undefined) navigator.geolocation.clearWatch(id)
        console.log("geo: unmount", { id })
        id = undefined
    }
    const error: PositionErrorCallback = err => {
        console.log(err)
        unmount()
    }
    if (typeof navigator !== "undefined" && navigator.geolocation) {
        id = navigator.geolocation.watchPosition(
            success,
            error,
            options || {
                enableHighAccuracy: false,
                timeout: 5000,
                maximumAge: 0,
            },
        )
        console.log("geo: mount", { id })
        navigator.geolocation.getCurrentPosition(success, error)
    }
    return unmount
}
