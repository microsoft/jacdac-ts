import express from "express"
import graphqlHTTP from "express-graphql"
import requestDevice from "../src/nodeusb"
import { createUSBBus } from "../src/usb"
import { getSchema, rootValue } from "../src/graphql"

const app = express();
console.log(`creating jacdac bus`)
const bus = createUSBBus({ requestDevice })

console.log(`connecting bus`)
bus.connectAsync()

console.log(`setting up express`)
app.use(
    '/graphql',
    graphqlHTTP({
        schema: getSchema(),
        rootValue: rootValue(bus),
        graphiql: true,
        pretty: true
    }),
);

console.log(`starting server at http://localhost:4000/graphql`)
app.listen(4000);
console.log(`closing`)