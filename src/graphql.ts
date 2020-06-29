import { graphql, buildSchema, parse, ExecutionResult, GraphQLSchema, subscribe as graphQLSubscribe, validate, GraphQLArgs } from "graphql"
import { Bus } from "./bus";
// tslint:disable-next-line: no-submodule-imports
import { withFilter } from "graphql-subscriptions/dist/with-filter";
import { Device } from "./device";
import { DEVICE_CONNECT, DEVICE_ANNOUNCE, DEVICE_DISCONNECT, REPORT_UPDATE, REPORT_RECEIVE } from "./constants";
import { serviceClass } from "./pretty"
import { EventEmitterPubSub, StreamingRegisterPubSub } from "./pubsub";
import { Register } from "./register";


let _schema: GraphQLSchema = undefined;

export function getSchema() {
    // lazy allocated schema
    if (!_schema) {
        // keep in sync with schema.graphql
        _schema = buildSchema(`
interface Node {
    id: ID!
}
type Device implements Node {
    id: ID!
    deviceId: ID!
    shortId: String!
    name: String!
    connected: Boolean!
    announced: Boolean!
    services(serviceName: String = "", serviceClass: Int = -1): [Service!]!
}
type Service implements Node {
    id: ID!
    serviceClass: Int!
    name: String
    register(address: Int): Register
}
type Register implements Node {
    id: ID!
    address: Int!
    data: [Int!]
    intValue: Int
}
type Query {
    connected: Boolean!
    connecting: Boolean!
    node(id: ID): Node
    devices(serviceName: String = "", serviceClass: Int = -1): [Device!]!
    device(deviceId: String): Device
}
type Subscription {
    deviceChanged(deviceId: ID = "", serviceClass: Int = -1, serviceName: String = ""): Device!
    reportReceived(deviceId: ID!, serviceNumber: Int = -1, serviceName: String = "", serviceClass: Int! = -1, address: Int!, updatesOnly: Boolean = false): Register!
}
schema {
    query: Query
    subscription: Subscription
}`);
    }
    return _schema
}

export interface QueryOptions {
    contextValue?: any;
    variableValues?: { [key: string]: any };
    operationName?: string;
}

export function queryAsync(bus: Bus, source: string, options?: QueryOptions): Promise<ExecutionResult> {
    options = options || {};
    return graphql(
        getSchema(),
        source,
        bus,
        options.contextValue,
        options.variableValues,
        options.operationName
    );
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

export function rootValue(bus: Bus) {
    return {
        query: bus,
        subscription: new Subscription(bus)
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

        const pubSub = new EventEmitterPubSub(this.bus)
        let subscribe = () => {
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
    reportReceived(options: { deviceId: string, serviceName?: string, serviceClass?: number, serviceNumber?: number, address: number, updatesOnly?: boolean }) {
        const device = this.bus.device(options.deviceId);
        if (!device)
            throw new Error("device not found");
        const service = device.services(options)[0];
        if (!service)
            throw new Error("service not found")
        const register = service.register(options)
        if (!register)
            throw new Error("register not found")

        const pubSub = new StreamingRegisterPubSub(register)
        let subscribe = () => {
            const events = [options.updatesOnly ? REPORT_UPDATE : REPORT_RECEIVE]
            return pubSub.asyncIterator<Register>(events);
        }
        const wrapped = wrapIterator<Register, { reportReceived: Register }>(subscribe, reportReceived => { return { reportReceived } });
        return toAsyncIterable(wrapped);
    }
}

export async function subscribeAsync(bus: Bus, query: string) {
    const subscription = await graphQLSubscribe({
        schema: getSchema(),
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
    let source: string = typeof strings === "string" ? strings : strings[0]
    source = source.trim();

    let query = queryCache[source]
    if (!query) {
        const document = parse(source);
        if (!document || document.kind !== 'Document')
            throw new Error('Not a valid GraphQL document.');

        // Validate
        getSchema();
        const validationErrors = validate(_schema, document);
        if (validationErrors.length > 0)
            throw new Error(validationErrors.map(e => e.message).join(', '));
        query = jdql[source] = new Query(source)
    }
    return query;
}

export function toAsyncIterable<T>(iterator: () => AsyncIterator<T>) {
    return { [Symbol.asyncIterator]: iterator }
}