import {
    isHighLevelRegister,
    isInfrastructure,
    serviceSpecifications,
} from "../jdom/spec"

export interface DeviceTwinRegisterSpec {
    code: number
    name: string
    kind: jdspec.PacketKind
    packFormat: string
    fields: string[]
}

export interface DeviceTwinSpec {
    serviceClass: number
    name: string
    registers: DeviceTwinRegisterSpec[]
}

export function serviceSpecificationToDeviceTwinSpecification(
    specification: jdspec.ServiceSpec
): DeviceTwinSpec {
    if (!specification) return undefined

    const {
        classIdentifier: serviceClass,
        camelName: name,
        packets,
    } = specification

    const registers = packets
        .filter(isHighLevelRegister) // TODO formalize
        .map<DeviceTwinRegisterSpec>(
            ({ identifier, name, packFormat, kind, fields }) => ({
                code: identifier,
                name,
                kind,
                packFormat,
                fields: fields.map(f => f.name),
            })
        )
    const dspec: DeviceTwinSpec = {
        serviceClass,
        name,
        registers,
    }
    return dspec
}

export function serviceSpecificationsWithDeviceTwinSpecification() {
    const specs = serviceSpecifications().filter(srv => !isInfrastructure(srv))
    return specs
}
