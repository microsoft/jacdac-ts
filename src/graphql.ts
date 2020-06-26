import { graphql, buildSchema, parse, validate, assertSchema } from "graphql"

// Construct a schema, using GraphQL schema language
const schema = buildSchema(`
  type Query {
    hello: String
  }
`);



// The root provides a resolver function for each API endpoint
const root = {
    hello: () => {
        return 'Hello world!';
    },
};

function jdql(strings) {
    // Parse and look for syntax errors
    const document = parse(strings);
    // validate
    const validationErrors = validate(schema, document);
    if (validationErrors.length > 0)
        throw new Error(validationErrors.map(er => er.message).join(', '));
    return strings;
}

const hello = jdql`{ hello`
graphql(schema, hello, root).then((response) => {
    console.log(response);
});
