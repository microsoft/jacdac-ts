import { graphql, buildSchema, parse, ExecutionResult, GraphQLSchema, subscribe as graphQLSubscribe, validate } from "graphql"
import { JDBus } from "../dom/bus";

let _schema: GraphQLSchema = undefined;
export function getSchema() {
    // lazy allocated schema
    if (!_schema) {
        // keep in sync with schema.graphql
        _schema = buildSchema(`
"""
A identifiable node in the JacDac DOM
"""
interface Node {
    """
    Global node identifier
    """
    id: ID!
}
"""
A device made of services
"""
type Device implements Node {
    """
    Global node identifier
    """
    id: ID!
    deviceId: ID!
    shortId: String!
    name: String!
    connected: Boolean!
    announced: Boolean!
    lastSeen: Int!
    lastServiceUpdate: Int!
    services(serviceName: String = "", serviceClass: Int = -1): [Service!]!
}
"""
A service node contains register and can send commands
"""
type Service implements Node {
    """
    Global node identifier
    """
    id: ID!
    device: Device!
    serviceClass: Int!
    name: String
    register(address: Int): Register
}
"""
A register on a device, can be set, get
"""
type Register implements Node {
    """
    Global node identifier
    """
    id: ID!
    service: Service!
    address: Int!
    data: [Int!]
    intValue: Int
}

"""
A bus of devices, service and register using the JacDac protocol
"""
type Query {
    """
    indicates if the bus is connected
    """
    connected: Boolean!

    """
    indicates if the bus is connection
    """
    connecting: Boolean!

    """
    current time for the bus (ms)
    """
    timestamp: Int!

    """
    queries a node from its id
    """
    node(id: ID): Node

    """
    queries devices on the bus that match the criteria
    """
    devices(serviceName: String = "", serviceClass: Int = -1): [Device!]!

    """
    queries a device by it's device id
    """
    device(deviceId: String): Device
}
schema {
    query: Query
}`);
    }
    return _schema
}

export interface QueryOptions {
    contextValue?: any;
    variableValues?: { [key: string]: any };
    operationName?: string;
}

export function queryAsync(bus: JDBus, source: string, options?: QueryOptions): Promise<ExecutionResult> {
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

export class Query {
    constructor(public readonly source: string) { }

    queryAsync(bus: JDBus) {
        return queryAsync(bus, this.source);
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
