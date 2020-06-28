import { graphql, buildSchema, parse, ExecutionResult, GraphQLSchema, subscribe as graphQLSubscribe, DocumentNode, validate } from "graphql"
import { Bus } from "./bus";
// tslint:disable-next-line: no-submodule-imports
import { withFilter } from "graphql-subscriptions/dist/with-filter";
import { Device } from "./device";
import { DEVICE_CONNECT, DEVICE_ANNOUNCE, DEVICE_DISCONNECT } from "./constants";
import { serviceClass } from "./pretty"
import { PubSub } from "./pubsub";


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
    deviceChanged(deviceId: ID = "", serviceClass: Int = -1, serviceName: String = ""): Device!
}
schema {
    query: Query
    subscription: Subscription
}`);
    }
}

export function queryAsync(bus: Bus, source: string): Promise<ExecutionResult> {
    initSchema();
    return graphql(schema, source, bus);
}

export function wrapIterator<T, U>(asyncIterator: () => AsyncIterator<T>, wrap: (T) => U): () => AsyncIterator<U> {
    return () => {
        const iterator = asyncIterator();
        return ({
            next() {
                return iterator.next().then(({ value, done }) => {
                    return { value: wrap(value), done };
                });
            },
            return() {
                return Promise.resolve({ value: undefined, done: true });
            },
            throw(error) {
                return Promise.reject(error);
            },
            [Symbol.asyncIterator]() {
                return this;
            }
        } as any)
    }
}

class Subscription {
    constructor(public bus: Bus) {

    }
    deviceChanged(options?: { deviceId?: string, serviceClass?: number, serviceName?: string }) {
        if (options?.serviceName && options?.serviceClass > -1)
            throw Error("serviceClass and serviceName cannot be used together")
        const deviceId = options?.deviceId;
        let sc = serviceClass(options?.serviceName);
        if (sc === undefined) sc = options?.serviceClass;
        if (sc === undefined) sc = -1;

        let subscribe = () => {
            const pubSub = new PubSub(this.bus)
            return pubSub.asyncIterator<Device>([
                DEVICE_CONNECT,
                DEVICE_ANNOUNCE,
                DEVICE_DISCONNECT]);
        }

        if (deviceId || sc > -1)
            subscribe = withFilter(subscribe, (payload) => {
                return (!deviceId || payload?.deviceId == deviceId)
                    && (sc < 0 || payload?.hasService(sc));
            });

        const wrapped = wrapIterator<Device, { deviceChanged: Device }>(subscribe, deviceChanged => { return { deviceChanged } });
        return toAsyncIterable(wrapped);
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

export class Query {
    constructor(public readonly source: string) { }

    queryAsync(bus: Bus) {
        return queryAsync(bus, this.source);
    }

    subscribeAsync(bus: Bus) {
        return subscribeAsync(bus, this.source);
    }
}

let queryCache = {}
export function jdql(strings): Query {
    let source = strings[0]
    source = source.trim();

    let query = queryCache[source]
    if (!query) {
        const document = parse(strings[0]);
        if (!document || document.kind !== 'Document')
            throw new Error('Not a valid GraphQL document.');

        // Validate
        initSchema();
        const validationErrors = validate(schema, document);
        if (validationErrors.length > 0)
            throw new Error(validationErrors.map(e => e.message).join(', '));
        query = jdql[source] = new Query(source)
    }
    return query;
}

export function toAsyncIterable<T>(iterator: () => AsyncIterator<T>) {
    return { [Symbol.asyncIterator]: iterator }
}