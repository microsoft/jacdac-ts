import { graphql, buildSchema, parse, ExecutionResult, GraphQLSchema, subscribe as graphQLSubscribe, DocumentNode } from "graphql"
import { Bus } from "./bus";
// tslint:disable-next-line: no-submodule-imports
import { withFilter } from "graphql-subscriptions/dist/with-filter";
import { Device } from "./device";
import { DEVICE_CONNECT, DEVICE_ANNOUNCE, DEVICE_DISCONNECT } from "./constants";


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
    deviceChanged(deviceId: ID = ""): Device!
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

class Subscription {
    constructor(public bus: Bus) {

    }
    deviceChanged(options?: { deviceId?: string }): AsyncIterable<Device> {
        let subscribe = () => this.bus.pubSub.asyncIterator<Device>([
            DEVICE_CONNECT,
            DEVICE_ANNOUNCE,
            DEVICE_DISCONNECT]);
        const deviceId = options?.deviceId;
        if (deviceId)
            subscribe = withFilter(subscribe, (payload) => payload?.deviceId == deviceId);

        return toAsyncIterable(subscribe);
    }
}

export async function subscribeAsync(bus: Bus, query: string) {
    initSchema();
    const subscription = await graphQLSubscribe({
        schema,
        document: parse(query),
        rootValue: new Subscription(bus)
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


export function toAsyncIterable<T>(iterator: () => AsyncIterator<T>) {
    return { [Symbol.asyncIterator]: iterator }
}