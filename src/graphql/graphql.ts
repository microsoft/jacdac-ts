import { graphql, buildSchema, parse, validate, assertSchema } from "graphql"
import { Bus } from "../bus";

// keep in sync with schema.graphql
const schema = buildSchema(`
type Bus {
    connected: Boolean!
    connecting: Boolean!
    devices: [Device!]!
    device(deviceId: String): Device
}
type Device {
    deviceId: ID
    shortId: String!
    name: String!
    services: [Int!]!
}
`);

export function create(bus: Bus): (query: string) => Promise<any> {
    const root = {
        connected: () => bus.connected,
        connecting: () => bus.connecting,
        devices: () => bus.devices(),
        device: (deviceId: string) => bus.device(deviceId)
    };

    return (query: string) => {
        return graphql(schema, query, root);
    }
}

/** 
 * Validates a GraphQL query against the JACDAC schema. 
*/
export function jdql(strings) {
    // Parse and look for syntax errors
    const document = parse(strings);
    // validate
    const validationErrors = validate(schema, document);
    if (validationErrors.length > 0)
        throw new Error(validationErrors.map(er => er.message).join(', '));
    return strings;
}
