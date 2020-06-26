import { graphql, buildSchema, parse, validate, DocumentNode, ExecutionResult, printSchema, GraphQLSchema } from "graphql"
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
        
        schema {
          query: Query
        }               
        `);
    }
}

export function createGraphQLQuery(bus: Bus): (query: string | Query) => Promise<ExecutionResult> {
    initSchema();

    return (query: string | Query) => {
        let source: string;
        const q = query as Query;
        if (q.source)
            source = q.source;
        else
            source = query as string;
        return graphql(schema, source, bus);
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
    initSchema();
    const validationErrors = validate(schema, document);
    if (validationErrors.length > 0)
        throw new Error(validationErrors.map(e => e.message).join(', '));
    return {
        source: strings,
        document
    }
}
