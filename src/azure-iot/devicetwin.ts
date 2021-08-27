import { SRV_CONTROL } from "../jdom/constants"
import {
    isHighLevelRegister,
    isInfrastructure,
    serviceSpecificationFromClassIdentifier,
    serviceSpecifications,
} from "../jdom/spec"

export interface ServiceTwinRegisterSpec {
    code: number
    name: string
    kind: jdspec.PacketKind
    packFormat: string
    fields: string[]
}

export interface ServiceTwinSpec {
    serviceClass: number
    name: string
    registers: ServiceTwinRegisterSpec[]
}

export function serviceSpecificationToServiceTwinSpecification(
    specification: jdspec.ServiceSpec
): ServiceTwinSpec {
    if (!specification) return undefined

    const {
        classIdentifier: serviceClass,
        camelName: name,
        packets,
    } = specification

    const registers = packets
        .filter(isHighLevelRegister) // TODO formalize
        .map<ServiceTwinRegisterSpec>(
            ({ identifier, name, packFormat, kind, fields }) => ({
                code: identifier,
                name,
                kind,
                packFormat,
                fields: fields.map(f => f.name),
            })
        )
    const dspec: ServiceTwinSpec = {
        serviceClass,
        name,
        registers,
    }
    return dspec
}

export function serviceSpecificationsWithServiceTwinSpecification() {
    const specs = [
        serviceSpecificationFromClassIdentifier(SRV_CONTROL),
        ...serviceSpecifications().filter(srv => !isInfrastructure(srv)),
    ]
    return specs
}
