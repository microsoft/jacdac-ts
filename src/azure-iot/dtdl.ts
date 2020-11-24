/***
 * JACDAC service/device specification to DTDL
 * 
 *  DTDL specification: https://github.com/Azure/opendigitaltwins-dtdl/blob/master/DTDL/v2/dtdlv2.md.
 */

import { serviceSpecificationFromClassIdentifier } from "../jdom/spec";
import { uniqueMap } from "../jdom/utils";

export const DTDL_REFERENCE_URL = "https://github.com/Azure/opendigitaltwins-dtdl/blob/master/DTDL/v2/dtdlv2.md"
export const DTDL_NAME = "Digital Twins Definition Language"
const CONTEXT = "dtmi:dtdl:context;2";

// https://github.com/Azure/digital-twin-model-identifier
// ^dtmi:(?:_+[A-Za-z0-9]|[A-Za-z])(?:[A-Za-z0-9_]*[A-Za-z0-9])?(?::(?:_+[A-Za-z0-9]|[A-Za-z])(?:[A-Za-z0-9_]*[A-Za-z0-9])?)*;[1-9][0-9]{0,8}$
function toDTMI(segments: (string | number)[], version?: number) {
    return `dtmi:jacdac:${[...segments]
        .map(seg => typeof seg === "string" ? seg : `x${seg.toString(16)}`)
        .map(seg => seg.replace(/(-|_)/g, ''))
        .join(':')};${version !== undefined ? version : 1}`.toLowerCase();
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
        "g": {
            semantic: "Acceleration",
            unit: "gForce"
        },
        "mA": {
            semantic: "Current",
            unit: "milliampere"
        },
        "uA": {
            semantic: "Current",
            unit: "microampere"
        },
        "A": {
            semantic: "Current",
            unit: "ampere"
        },
        "mV": {
            semantic: "Voltage",
            unit: "millivolt"
        },
        "uV": {
            semantic: "Voltage",
            unit: "microvolt"
        },
        "V": {
            semantic: "Voltage",
            unit: "volt"
        },
    };
    const unit = units[field.unit];
    if (unit)
        return unit;

    // ignoring some known units
    if (["#", "/"].indexOf(field.unit) > -1)
        return undefined;

    console.warn(`unsupported unit ${field.unit}`)
    return undefined;
}

// https://github.com/Azure/opendigitaltwins-dtdl/blob/master/DTDL/v2/dtdlv2.md#primitive-schemas

function enumDTDI(srv: jdspec.ServiceSpec, en: jdspec.EnumInfo): string {
    return toDTMI([srv.classIdentifier, en.name])
}

function enumSchema(srv: jdspec.ServiceSpec, en: jdspec.EnumInfo): DTDLSchema {
    const dtdl = {
        "@type": "Enum",
        "@id": enumDTDI(srv, en),
        "valueSchema": "integer",
        "enumValues": Object.keys(en.members).map(k => ({
            name: escapeName(k),
            displayName: k,
            enumValue: en.members[k]
        }))
    }
    return dtdl;
}

function fieldType(srv: jdspec.ServiceSpec, pkt: jdspec.PacketInfo, field: jdspec.PacketMember) {
    let type: string;
    if (field.type == "bool")
        type = "boolean";
    else if (field.isFloat)
        type = "float";
    else if (field.isSimpleType) {
        if (/^(u|i)/.test(field.type))
            type = "integer";
        else if (field.type === "B")
            // base64 encoded binary data
            type = "string";
    }
    else if (field.type === "string" || field.type == "string0")
        type = "string";
    else if (field.shift && /^(u|i)/.test(field.type))
        type = "float"; // decimal type
    else {
        const en = srv.enums[field.type];
        if (en)
            type = enumDTDI(srv, en);
    }

    if (!type)
        console.warn(`unknown field type ${field.type}`, field)

    return {
        name: field.name == "_" ? pkt.name : field.name,
        type: type
    }
}

// warps fields into an object
function objectSchema(schemas: DTDLSchema[]): DTDLSchema {
    return {
        "@type": "Object",
        "fields": schemas
    }
}

// wraps a schema into an array
function arraySchema(schema: string | DTDLSchema): DTDLSchema {
    return {
        "@type": "Array",
        "elementSchema": schema
    }
}

// converts JADAC pkt data layout into a DTDL schema
function toSchema(srv: jdspec.ServiceSpec, pkt: jdspec.PacketInfo, supportsArray?: boolean): string | DTDLSchema {
    const fields = pkt.fields.map(field => fieldType(srv, pkt, field));
    if (!fields.length)
        return undefined;

    // a single data entry
    if (fields.length === 1 && !pkt.fields[0].startRepeats)
        return fields[0].type;

    // map fields into schema
    const schemas: DTDLSchema[] =
        fields.map(field => ({
            name: field.name,
            schema: field.type
        }))

    // is there an array?
    const repeatIndex = pkt.fields.findIndex(field => field.startRepeats);

    if (repeatIndex < 0) {
        // no array
        // wrap schemas into an object
        return objectSchema(schemas)
    }

    // check if arrays are supported
    if (!supportsArray) {
        console.warn(`arrays not supported in ${srv.shortName}.${pkt.name}`)
        return undefined;
    }

    if (repeatIndex == 0) {
        // the whole structure is an array
        return arraySchema(objectSchema(schemas))
    }
    else {
        // split fields into prelude and array data
        const nonRepeat = schemas.slice(0, repeatIndex);
        const repeats = schemas.slice(repeatIndex);
        return objectSchema([
            ...nonRepeat,
            {
                name: "repeat",
                schema: arraySchema(repeats.length > 1 ? objectSchema(repeats) : repeats[0])
            }
        ]);
    }
}

function packetToDTDL(srv: jdspec.ServiceSpec, pkt: jdspec.PacketInfo): DTDLContent {
    const types: jdspec.SMap<string> = {
        "const": "Property",
        "rw": "Property",
        "ro": "Property",
        "event": "Telemetry"
    }
    const dtdl: any = {
        "@type": types[pkt.kind] || `Unsupported${pkt.kind}`,
        name: pkt.name,
        "@id": toDTMI([srv.classIdentifier, pkt.kind, pkt.name]),
        description: pkt.description,
    }
    switch (pkt.kind) {
        case "report":
        case "command":
            // https://docs.microsoft.com/en-us/azure/digital-twins/concepts-models#azure-digital-twins-dtdl-implementation-specifics
            return undefined;
        case "const":
        case "rw":
        case "ro":
        case "event":
            const unit = toUnit(pkt);
            if (unit) {
                dtdl.unit = unit.unit;
            }
            dtdl.schema = toSchema(srv, pkt, false)
            if (pkt.kind === "rw")
                dtdl.writable = true;
            if (!dtdl.schema && pkt.kind === "event") {
                // keep a count of the events
                dtdl["@type"] = [dtdl["@type"], "Event"]
                dtdl.schema = toDTMI([srv.classIdentifier, "event"]);
            }
            else if (unit && unit.semantic)
                dtdl["@type"] = [dtdl["@type"], unit.semantic]
            break;
        default:
            console.log(`unknown packet kind ${pkt.kind}`)
            break;
    }

    if (!dtdl.schema) {
        console.log(`unknown schema for ${srv.name}.${pkt.name}`);
        return undefined;
    }

    return dtdl;
}


interface DTDLNode {
    '@type'?: string;
    '@id'?: string;
    // 1-64 characters
    // ^[a-zA-Z](?:[a-zA-Z0-9_]*[a-zA-Z0-9])?$
    name?: string;
    displayName?: string,
    description?: string;
}

interface DTDLSchema extends DTDLNode {
    fields?: DTDLSchema[];
    schema?: string | DTDLSchema;
    elementSchema?: string | DTDLSchema;
}

interface DTDLContent extends DTDLNode {
    '@type': "Property" | "Command" | "Component" | "Interface";
    unit?: string;
    schema?: string | DTDLSchema;
}

interface DTDLInterface extends DTDLContent {
    contents: DTDLContent[];
    schemas?: (DTDLSchema | DTDLInterface)[];
    '@context'?: string;
}

function escapeName(name: string) {
    name = name.trim().replace(/[^a-zA-Z0-9_]/g, '_');
    if (!/^[a-zA-Z]/.test(name))
        name = "a" + name;
    name = name[0].toLowerCase() + name.slice(1);
    return name.slice(0, 64);
}

function escapeDisplayName(name: string) {
    return name.slice(0, 64);
}

export function serviceSpecificationToDTDL(srv: jdspec.ServiceSpec): DTDLInterface {
    const dtdl: DTDLInterface = {
        "@type": "Interface",
        "@id": serviceSpecificationDTMI(srv),
        "displayName": escapeDisplayName(srv.name),
        "description": srv.notes["short"],
        "contents": srv.packets
            .filter(pkt => !pkt.derived)
            .map(pkt => packetToDTDL(srv, pkt)).filter(c => !!c)
    }
    const hasEvents = srv.packets.find(pkt => pkt.kind === "event");
    const hasEnums = Object.keys(srv.enums).length;
    if (hasEvents || hasEnums) {
        dtdl.schemas = [];
        if (hasEvents)
            dtdl.schemas.push({
                "@id": toDTMI([srv.classIdentifier, "event"]),
                "@type": "Object",
                "fields": [{
                    "name": "count",
                    "schema": "integer"
                }]
            });
        if (hasEnums)
            dtdl.schemas = dtdl.schemas.concat(Object.keys(srv.enums).map(en => enumSchema(srv, srv.enums[en])));
    }
    dtdl["@context"] = CONTEXT
    return dtdl;
}

function serviceSpecificationToComponent(srv: jdspec.ServiceSpec, name: string): any {
    const dtdl = {
        "@type": "Component",
        "name": name,
        "displayName": escapeDisplayName(srv.name),
        "schema": serviceSpecificationDTMI(srv)
    }
    return dtdl;
}

export interface DTDLGenerationOptions {
    services?: boolean; // generate all services
}

export function serviceSpecificationDTMI(srv: jdspec.ServiceSpec) {
    return toDTMI(["services", srv.classIdentifier])
}

export function deviceSpecificationDTMI(dev: jdspec.DeviceSpec) {
    return toDTMI(["devices", dev.id.replace(/-/g, ':')]);
}

export function deviceSpecificationToDTDL(dev: jdspec.DeviceSpec, options?: DTDLGenerationOptions): any {
    const services = dev.services.map(srv => serviceSpecificationFromClassIdentifier(srv));
    const uniqueServices = uniqueMap(services, srv => srv.classIdentifier.toString(), srv => srv);
    const schemas = uniqueServices.map(srv => serviceSpecificationToDTDL(srv));

    // allocate names
    let names: string[] = [];
    services.forEach((srv, i) => {
        let name = escapeName(srv.shortId || srv.shortName)
        if (names.indexOf(name) < 0)
            names.push(name)
        else {
            let count = 2;
            while (names.indexOf(name + count) > -1)
                count;
            names.push(name + count);
        }
    })

    const dtdl: DTDLInterface = {
        "@type": "Interface",
        "@id": deviceSpecificationDTMI(dev),
        "displayName": escapeDisplayName(dev.name),
        "description": dev.description,
        "contents": services.map((srv, i) => serviceSpecificationToComponent(srv, names[i])),
        "@context": CONTEXT
    }
    if (options?.services)
        return [dtdl, ...schemas]
    else
        return dtdl
}
