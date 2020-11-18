/***
 * JACDAC service/device specification to DTDL
 * 
 *  DTDL specification: https://github.com/Azure/opendigitaltwins-dtdl/blob/master/DTDL/v2/dtdlv2.md.
 */

import { serviceSpecificationFromClassIdentifier } from "../jdom/spec";
import { uniqueMap } from "../jdom/utils";

export const REFERENCE_URL = "https://github.com/Azure/opendigitaltwins-dtdl/blob/master/DTDL/v2/dtdlv2.md"
export const DTDL_NAME = "Digital Twins Definition Language"

// https://github.com/Azure/digital-twin-model-identifier
// ^dtmi:(?:_+[A-Za-z0-9]|[A-Za-z])(?:[A-Za-z0-9_]*[A-Za-z0-9])?(?::(?:_+[A-Za-z0-9]|[A-Za-z])(?:[A-Za-z0-9_]*[A-Za-z0-9])?)*;[1-9][0-9]{0,8}$
function toDTMI(dev: jdspec.DeviceSpec, segments: (string | number)[], version?: number) {
    return `dtmi:jacdac:${[dev.id, ...segments].map(seg => typeof seg === "string" ? seg : `x${seg.toString(16)}`).join(':')};${version !== undefined ? version : 1}`;
}

function toUnit(pkt: jdspec.PacketInfo) {
    if (pkt.fields.length !== 1)
        return undefined;
    const field = pkt.fields[0];
    if (!field.unit)
        return undefined;

    /**
     *     type Unit = "m" | "kg" | "g" | "s" | "A" | "K" | "cd" | "mol" | "Hz" | "rad" | "sr" | "N" | "Pa" | "J" | "W" | "C" | "V" | "F" | "Ohm"
        | "S" | "Wb" | "T" | "H" | "Cel" | "lm" | "lx" | "Bq" | "Gy" | "Sv" | "kat" | "m2" | "m3" | "l" | "m/s" | "m/s2" | "m3/s" | "l/s"
        | "W/m2" | "cd/m2" | "bit" | "bit/s" | "lat" | "lon" | "pH" | "dB" | "dBW" | "Bspl" | "count" | "/" | "%RH" | "%EL" | "EL"
        | "1/s" | "1/min" | "beat/min" | "beats" | "S/m" | "B" | "VA" | "VAs" | "var" | "vars" | "J/m" | "kg/m3" | "deg";

    type SecondaryUnit = "ms" | "min" | "h" | "MHz" | "kW" | "kVA" | "kvar" | "Ah" | "Wh" | "kWh"
        | "varh" | "kvarh" | "kVAh" | "Wh/km" | "KiB" | "GB" | "Mbit/s" | "B/s" | "MB/s" | "mV" | "mA" | "dBm" | "ug/m3"
        | "mm/h" | "m/h" | "ppm" | "/100" | "/1000" | "hPa" | "mm" | "cm" | "km" | "km/h";
     */
    const units: jdspec.SMap<{ semantic: string; unit: string; }> = {
        "m/s2": {
            semantic: "Acceleration",
            unit: "metrePerSecondSquared"
        },
        "rad": {
            semantic: "Angle",
            unit: "radian"
        },
        "rad/s": {
            semantic: "AngularVelocity",
            unit: "radianPerSecond"
        },
        "rad/s2": {
            semantic: "AngularAcceleration",
            unit: "radianPerSecondSquared"
        },
        "m": {
            semantic: "Length",
            unit: "metre"
        },
        "m2": {
            semantic: "Area",
            unit: "squareMetre"
        },
        "s": {
            semantic: "TimeSpan",
            unit: "second"
        },
        "ms": {
            semantic: "TimeSpan",
            unit: "millisecond"
        },
        "us": {
            semantic: "TimeSpan",
            unit: "microsecond"
        },
        "K": {
            semantic: "Temperature",
            unit: "kelvin"
        },
        "C": {
            semantic: "Temperature",
            unit: "degreeCelsius"
        },
        "F": {
            semantic: "Temperature",
            unit: "degreeFahrenheit"
        },
    };
    const unit = units[field.unit];
    if (unit)
        return unit;

    console.warn(`unsupported unit ${field.unit}`)
    return undefined;
}

// https://github.com/Azure/opendigitaltwins-dtdl/blob/master/DTDL/v2/dtdlv2.md#primitive-schemas

function enumDTDI(dev: jdspec.DeviceSpec, srv: jdspec.ServiceSpec, en: jdspec.EnumInfo): string {
    return toDTMI(dev, [srv.classIdentifier, en.name])
}

function enumSchema(dev: jdspec.DeviceSpec, srv: jdspec.ServiceSpec, en: jdspec.EnumInfo): DTDLSchema {
    const dtdl = {
        "@type": "Enum",
        "@id": enumDTDI(dev, srv, en),
        "name": en.name,
        "valueSchema": "integer",
        "enumValues": Object.keys(en.members).map(k => ({
            name: k,
            enumValue: en.members[k]
        }))
    }
    return dtdl;
}

function toSchema(dev: jdspec.DeviceSpec, srv: jdspec.ServiceSpec, pkt: jdspec.PacketInfo): string {
    // todo: startsRepeats
    if (pkt.fields.length !== 1)
        return undefined;
    const field = pkt.fields[0];
    if (field.type == "bool")
        return "boolean";
    if (field.isFloat)
        return "float";
    if (field.isSimpleType) {
        if (/^(u|i)/.test(field.type))
            return "integer";
        else if (field.type === "B")
            // base64 encoded binary data
            return "string";
    }
    if (field.type === "string")
        return "string";
    if (field.shift && field.storage === 4 && /^(u|i)/.test(field.type))
        return "float"; // decimal type
    const en = srv.enums[field.type];
    if (en)
        return enumDTDI(dev, srv, en);
    console.warn(`unsupported schema`, { fields: pkt.fields })
    return undefined;
}

function packetToDTDL(dev: jdspec.DeviceSpec, srv: jdspec.ServiceSpec, pkt: jdspec.PacketInfo): DTDLContent {
    const types: jdspec.SMap<string> = {
        "command": "Command",
        "const": "Property",
        "rw": "Property",
        "ro": "Property",
        "event": "Telemetry"
    }
    const dtdl: any = {
        "@type": types[pkt.kind] || `Unsupported${pkt.kind}`,
        name: pkt.name,
        "@id": toDTMI(dev, [srv.shortId, pkt.kind, pkt.name]),
        description: pkt.description,
    }
    switch (pkt.kind) {
        case "command":
            break;
        case "const":
        case "rw":
        case "ro":
        case "event":
            const unit = toUnit(pkt);
            if (unit) {
                dtdl.unit = unit.unit;
            }
            dtdl.schema = toSchema(dev, srv, pkt)
            if (pkt.kind === "rw")
                dtdl.writable = true;
            if (pkt.kind == "ro" && pkt.identifier == 0x101) // isReading
                dtdl["@type"] = "Telemetry"

            if (!dtdl.schema && pkt.kind === "event") {
                // keep a count of the events
                dtdl["@type"] = [dtdl["@type"], "Event"]
                dtdl.schema = toDTMI(dev, [srv.shortId, "event"]);
            }
            else if (unit && unit.semantic)
                dtdl["@type"] = [dtdl["@type"], unit.semantic]
            break;
        default:
            console.log(`unknown packet kind ${pkt.kind}`)
            break;
    }
    return dtdl;
}


export interface DTDLNode {
    '@type'?: string;
    '@id'?: string;
    name?: string;
    displayName?: string,
    description?: string;
}

export interface DTDLSchema extends DTDLNode {
    fields?: DTDLSchema[];
    schema?: string | DTDLSchema;
}

export interface DTDLContent extends DTDLNode {
    '@type': "Property" | "Command" | "Component" | "Interface";
    unit?: string;
    schema?: string | DTDLSchema;
}

export interface DTDLInterface extends DTDLContent {
    contents: DTDLContent[];
    schemas?: (DTDLSchema | DTDLInterface)[];
    '@context'?: "dtmi:dtdl:context;2";
}

function serviceToInterface(dev: jdspec.DeviceSpec, srv: jdspec.ServiceSpec): DTDLInterface {
    const dtdl: DTDLInterface = {
        "@type": "Interface",
        "@id": toDTMI(dev, [srv.shortId]),
        "name": srv.shortName,
        "displayName": srv.name,
        "description": srv.notes["short"],
        "contents": srv.packets.map(pkt => packetToDTDL(dev, srv, pkt)).filter(c => !!c)
    }
    const hasEvents = srv.packets.find(pkt => pkt.kind === "event");
    const hasEnums = Object.keys(srv.enums).length;
    if (hasEvents || hasEnums) {
        dtdl.schemas = [];
        if (hasEvents)
            dtdl.schemas.push({
                "@id": toDTMI(dev, [srv.shortId, "event"]),
                "@type": "Object",
                "fields": [{
                    "name": "count",
                    "schema": "integer"
                }]
            });
        if (hasEnums)
            dtdl.schemas = dtdl.schemas.concat(Object.keys(srv.enums).map(en => enumSchema(dev, srv, srv.enums[en])));
    }
    //if (srv.extends?.length)
    //    dtdl.extends = srv.extends.map(id => toDTMI([id]))
    return dtdl;
}

function serviceToComponent(dev: jdspec.DeviceSpec, srv: jdspec.ServiceSpec, serviceIndex: number): any {
    const dtdl = {
        "@type": "Component",
        "name": srv.shortName,
        "displayName": srv.name,
        "schema": toDTMI(dev, [srv.shortId])
    }
    return dtdl;
}

export function deviceToInterface(dev: jdspec.DeviceSpec): DTDLInterface {
    const services = dev.services.map(srv => serviceSpecificationFromClassIdentifier(srv));
    const uniqueServices = uniqueMap(services, srv => srv.classIdentifier.toString(), srv => srv);
    const schemas = uniqueServices.map(srv => serviceToInterface(dev, srv));

    const dtdl: DTDLInterface = {
        "@type": "Interface",
        "@id": toDTMI(dev, []),
        "name": dev.name,
        "description": dev.description,
        "contents": services.map((srv, i) => serviceToComponent(dev, srv, i)),
        schemas
    }
    return dtdl;
}

export function DTDLtoString(dtdl: DTDLInterface) {
    dtdl["@context"] = "dtmi:dtdl:context;2";
    return JSON.stringify(dtdl, undefined, 4);
}
