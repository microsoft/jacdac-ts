import React, { useState } from 'react'
import { useContext } from "react";
import JacdacContext from "../../../src/react/Context";
import { queryAsync, getSchema } from "../../../src/graphql/graphql"
// tslint:disable-next-line: no-import-side-effect no-submodule-imports
import "graphiql/graphiql.min.css";
import GraphiQL from 'graphiql';
// tslint:disable-next-line: no-submodule-imports
import { FetcherParams, FetcherOpts, Fetcher } from 'graphiql/dist/components/GraphiQL';

export function useFetcher() {
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
    return fetcher;
}

const defaultQuery = `{
    connected
    devices {
        deviceId
    }
}
`

const JacDaciQL = (props: { query?: string }) => {
    const fetcher = useFetcher();
    const [q, setq] = useState(props.query)
    console.log(props)
    return <JacdacContext.Consumer>
        {({ connected, connecting, connectAsync, disconnectAsync }) => (
            <div style={{ width: "100%", height: "18rem" }}>
                <GraphiQL
                    fetcher={fetcher}
                    query={q}
                    defaultQuery={defaultQuery}
                    defaultVariableEditorOpen={false}
                    headerEditorEnabled={false}
                    shouldPersistHeaders={false}>
                    <GraphiQL.Toolbar>
                        <GraphiQL.ToolbarButton label={connected ? "Disconnect" : connecting ? "..." : "Connect"} title="Connect or disconnect to JACDAC bus" onClick={connected ? disconnectAsync : connectAsync} />
                        <GraphiQL.ToolbarButton label={"Reset"} title="Reset example" onClick={() => setq(props.query || defaultQuery)} />
                    </GraphiQL.Toolbar>
                    <GraphiQL.Logo>JacDacQL</GraphiQL.Logo>
                    <GraphiQL.Footer></GraphiQL.Footer>
                </GraphiQL>
            </div>
        )}
    </JacdacContext.Consumer >


}

export default JacDaciQL