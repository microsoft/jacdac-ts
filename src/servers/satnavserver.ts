import { JDRegisterServer, SatNavFixQuality, SRV_SAT_NAV } from "../jacdac"
import { SensorServer } from "./sensorserver"

export type SatNavReadingType = [
    number, // time
    number, // latitude
    number, // longitude
    number, // accuracy
    number, // altitude,
    number // altitude accuracy
]

export type SatNavFixType = [
    number,
    number,
    number,
    number,
    number,
    SatNavFixQuality,
    number
]

export class SatNavServer extends SensorServer<SatNavReadingType> {
    readonly enabled: JDRegisterServer<[boolean]>
    readonly fix: JDRegisterServer<[boolean]>

    constructor() {
        super(SRV_SAT_NAV, {
            streamingInterval: 1000,
        })
    }

    setGeolocationPosition(
        loc: GeolocationPosition,
        skipChangeEvent?: boolean
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
            skipChangeEvent
        )
    }
}

export function watchLocation(
    server: SatNavServer,
    options?: PositionOptions
): () => void {
    let id: number = undefined
    const success: PositionCallback = pos => server.setGeolocationPosition(pos)
    const unmount = () => {
        if (id !== undefined) navigator.geolocation.clearWatch(id)
        id = undefined
    }
    const error: PositionErrorCallback = err => {
        console.log(err)
        unmount()
    }
    if (typeof navigator !== "undefined" && navigator.geolocation)
        id = navigator.geolocation.watchPosition(
            success,
            error,
            options || {
                enableHighAccuracy: false,
                timeout: 5000,
                maximumAge: 0,
            }
        )
    return unmount
}
