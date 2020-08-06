import React, { useState, useContext } from 'react'
import JacdacContext from "../../../src/react/Context";
import { queryAsync } from "../../../src/graphql/graphql"
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

class MemStorage {
    data: { [index: string]: string } = {};
    getItem = (key: string) => this.data[key];
    removeItem = (key: string) => {
        delete this.data[key];
    }
    setItem = (key: string, value: string) => {
        this.data[key] = value
    }
    get length(): number {
        return Object.keys(this.data).length
    }

}

const JDiQL = (props: { query?: string }) => {
    const fetcher = useFetcher();
    const [q, setq] = useState(props.query)
    const storage = new MemStorage()

    return <div style={{ width: "100%", height: "36rem" }}>
        <GraphiQL
            fetcher={fetcher}
            query={q}
            defaultQuery={defaultQuery}
            defaultVariableEditorOpen={false}
            headerEditorEnabled={false}
            shouldPersistHeaders={false}
            storage={storage}>
            <GraphiQL.Toolbar>
                <GraphiQL.ToolbarButton label={"Reset"} title="Reset example" onClick={() => setq(props.query || defaultQuery)} />
            </GraphiQL.Toolbar>
            <GraphiQL.Logo>JACDAC-QL</GraphiQL.Logo>
            <GraphiQL.Footer></GraphiQL.Footer>
        </GraphiQL>
    </div>
}

export default JDiQL