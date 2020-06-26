import { graphql, buildSchema, parse, validate, DocumentNode, ExecutionResult } from "graphql"
import { Bus } from "./bus";

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
schema {
  query: Bus
}
`);

export function createGraphQLQuery(bus: Bus): (query: string | Query) => Promise<ExecutionResult> {
    const root = {
        connected: () => bus.connected,
        connecting: () => bus.connecting,
        devices: () => bus.devices(),
        device: (deviceId: string) => bus.device(deviceId)
    };

    return (query: string | Query) => {
        let source: string;
        const q = query as Query;
        if (q.source)
            source = q.source;
        else
            source = query as string;
        return graphql(schema, source, root);
    }
}

export interface Query {
    source: string;
    document: DocumentNode;
}

/**
 * Parses and validates a JACDAC GraphQL query into a document node
 * @param strings 
 */
export function jdql(strings): Query {
    // Parse
    const document = parse(strings);

    // Validate
    const validationErrors = validate(schema, document);
    if (validationErrors.length > 0)
        throw new Error(validationErrors.map(e => e.message).join(', '));
    return {
        source: strings,
        document
    }
}
