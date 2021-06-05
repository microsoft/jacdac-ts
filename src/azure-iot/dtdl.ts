/***
 *  DTDL specification: https://github.com/Azure/opendigitaltwins-dtdl/blob/master/DTDL/v2/dtdlv2.md.
 */
export const DTDL_REFERENCE_URL =
    "https://github.com/Azure/opendigitaltwins-dtdl/blob/master/DTDL/v2/dtdlv2.md"
export const DTDL_NAME = "Digital Twins Definition Language"
export const DTDL_CONTEXT = "dtmi:dtdl:context;2"

// warps fields into an object
export function objectSchema(schemas: DTDLSchema[]): DTDLSchema {
    return {
        "@type": "Object",
        fields: schemas,
    }
}

// wraps a schema into an array
export function arraySchema(schema: string | DTDLSchema): DTDLSchema {
    return {
        "@type": "Array",
        elementSchema: schema,
    }
}

export interface DTDLNode {
    "@type"?: string
    "@id"?: string
    // 1-64 characters
    // ^[a-zA-Z](?:[a-zA-Z0-9_]*[a-zA-Z0-9])?$
    name?: string
    displayName?: string
    description?: string
}

export interface DTDLSchema extends DTDLNode {
    fields?: DTDLSchema[]
    schema?: string | DTDLSchema
    elementSchema?: string | DTDLSchema
}

export interface DTDLContent extends DTDLNode {
    "@type": "Property" | "Command" | "Component" | "Interface"
    unit?: string
    schema?: string | DTDLSchema
}

export interface DTDLInterface extends DTDLContent {
    contents: DTDLContent[]
    extends?: string | string[]
    schemas?: (DTDLSchema | DTDLInterface)[]
    "@context"?: string
}

export function escapeName(name: string) {
    name = name.trim().replace(/[^a-zA-Z0-9_]/g, "_")
    if (!/^[a-zA-Z]/.test(name)) name = "a" + name
    name = name[0].toLowerCase() + name.slice(1)
    return name.slice(0, 64)
}

export function escapeDisplayName(name: string) {
    return name.slice(0, 64)
}
