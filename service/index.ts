import express from "express"
import graphqlHTTP from "express-graphql"
import { Bus } from "../src/bus"
import requestDevice from "../src/nodewebusb"
import { getSchema, rootValue } from "../src/graphql"

const app = express();
const bus = new Bus({ requestDevice })
bus.connectAsync()

app.use(
    '/graphql',
    graphqlHTTP({
        schema: getSchema(),
        rootValue: rootValue(bus),
        graphiql: true,
        pretty: true
    }),
);

app.listen(4000);