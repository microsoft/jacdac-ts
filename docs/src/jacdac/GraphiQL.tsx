import React from 'react'
import { useContext } from "react";
import JacdacContext from "./Context"
import { queryAsync } from "../../../src/graphql"
// tslint:disable-next-line: no-import-side-effect no-submodule-imports
import "graphiql/graphiql.min.css";
import GraphiQL from 'graphiql';
// tslint:disable-next-line: no-submodule-imports
import { FetcherParams, FetcherOpts, Fetcher } from 'graphiql/dist/components/GraphiQL';

const JacDaciQL = () => {
    const ctx = useContext(JacdacContext)
    const fetcher: Fetcher = async function (args: FetcherParams, opts?: FetcherOpts) {
        const bus = ctx.bus;
        const options = {
            variableValues: args.variables && JSON.parse(args.variables),
            operationName: args.operationName
        };
        return await queryAsync(bus, args.query, options)
            .then(r => {
                return {
                    data: r.data
                }
            })
    }
    return <GraphiQL fetcher={fetcher} />
}

export default JacDaciQL