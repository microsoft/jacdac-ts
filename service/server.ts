import express from "express"
import graphqlHTTP from "express-graphql"
import requestDevice from "../src/nodeusb"
import { createUSBBus } from "../src/usb"
import { getSchema, rootValue } from "../src/graphql"

const app = express();
const bus = createUSBBus({ requestDevice })
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