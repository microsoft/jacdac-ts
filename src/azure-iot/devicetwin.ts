import { SRV_CONTROL } from "../jdom/constants"
import {
    isHighLevelRegister,
    isInfrastructure,
    serviceSpecificationFromClassIdentifier,
    serviceSpecifications,
} from "../jdom/spec"

export enum ServiceTwinRegisterFlag {
    Const = 0x0001,
    Volatile = 0x0002,
}

export interface ServiceTwinRegisterSpec {
    code: number // code <= 255 => ro, otherwise rw
    name: string
    flags: ServiceTwinRegisterFlag
    packf: string
    fields?: string[]
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
        .map<ServiceTwinRegisterSpec>(reg => {
            let flags = 0
            if (reg.kind == "const") flags |= ServiceTwinRegisterFlag.Const
            if (reg.volatile) flags |= ServiceTwinRegisterFlag.Volatile
            const r: ServiceTwinRegisterSpec = {
                code: reg.identifier,
                name: reg.name,
                flags,
                packf: reg.packFormat,
                fields:
                    reg.fields.length > 1
                        ? reg.fields.map(f => f.name)
                        : undefined,
            }
            return r
        })
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
