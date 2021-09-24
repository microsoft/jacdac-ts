import JDBus from "./bus"
import { isSensor, serviceSpecifications } from "./spec"
import { toMap } from "./utils"

let _sensorSpecs: jdspec.ServiceSpec[]

/**
 * Gets the list of sensor specifications available
 * @returns
 */
export function sensorSpecifications() {
    if (!_sensorSpecs) {
        _sensorSpecs = serviceSpecifications().filter(
            srv => !srv.shortName.startsWith("_") && isSensor(srv)
        )
    }
    return _sensorSpecs
}

/**
 * Collects and flattens all sensor data into a serializable object
 * @param bus
 * @returns
 */
export function snapshotSensors(
    bus: JDBus
): Record<string, number[] | Record<string, number>[]> {
    return toMap(
        sensorSpecifications(),
        srv => srv.camelName,
        srv =>
            bus
                .services({
                    serviceClass: srv.classIdentifier,
                    ignoreSelf: true,
                    announced: true,
                })
                .map(srv => {
                    const reg = srv.readingRegister
                    const spec = reg.specification
                    return spec.fields.length === 1
                        ? reg.unpackedValue?.[0] || 0
                        : reg.objectValue || {}
                })
    )
}
