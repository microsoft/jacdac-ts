import { graphql, buildSchema, parse, ExecutionResult, GraphQLSchema, subscribe as graphQLSubscribe, DocumentNode } from "graphql"
import { Bus } from "./bus";


let schema: GraphQLSchema = undefined;

function initSchema() {
    // lazy allocated schema
    if (!schema) {
        // keep in sync with schema.graphql
        schema = buildSchema(`
type Query {
    connected: Boolean!
    connecting: Boolean!
    devices(serviceName: String = "", serviceClass: Int = -1): [Device!]!
    device(deviceId: String): Device
}
type Device {
    deviceId: ID
    shortId: String!
    name: String!
    services(serviceName: String = "", serviceClass: Int = -1): [Service!]!
}
type Service {
    serviceClass: Int!
    name: String
    register(address: Int): Register
}
type Register {
    address: Int!
    data: [Int!]
    intValue: Int
}
type Subscription {
    deviceChanged: Device!
}
schema {
    query: Query
    subscription: Subscription
}`);
    }
}

export function queryAsync(bus: Bus, query: string | Query): Promise<ExecutionResult> {
    initSchema();
    let source: string;
    const q = query as Query;
    if (q.source)
        source = q.source;
    else
        source = query as string;
    return graphql(schema, source, bus);
}

export async function subscribeAsync(bus: Bus, query: string) {
    initSchema();
    const subscription = await graphQLSubscribe({
        schema,
        document: parse(query),
        rootValue: bus
    });
    return subscription;
}

export interface Query {
    source: string;
    document: DocumentNode;
}

/*
export function jdql(strings): Query {
    // Parse
    const document = parse(strings);

    // Validate
    initSchema();
    const validationErrors = validate(schema, document);
    if (validationErrors.length > 0)
        throw new Error(validationErrors.map(e => e.message).join(', '));
    return {
        source: strings,
        document
    }
}
*/