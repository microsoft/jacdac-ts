import { useContext, useRef, useState, useEffect } from "react";
import JacdacContext from "./Context";
import { Query } from "../../../src/graphql";



export type OperationVariables = { [name: string]: any; };

export interface QueryHookOptions<TData = any, TVariables = OperationVariables> {
    variables?: { [name: string]: any; };
}

export interface QueryResult<TData = any, TVariTVariables = OperationVariables> {
    data?: TData;
    loading?: boolean;
    error?: any;
    variables?: { [name: string]: any; };
}

export function useQuery<TData = any, TVariables = OperationVariables>(
    query: string | Query,
    options?: QueryHookOptions<TData, TVariables>,
): QueryResult<TData, TVariables> {
    const ctx = useContext(JacdacContext);
    const [data, setData] = useState(undefined);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(undefined);

    useEffect(() => {
        const fetch = async () => {
            try {
                console.log(`jdql: ${query}`)
                const res = await ctx.bus.queryAsync(query);
                console.log(`jdql res:`, res)
                if (res.errors)
                    setError(res.errors.map(er => er.message).join(', '))
                else
                    setData(data.data);
            } catch (e) {
                setError(e)
            }
            finally {
                setLoading(false);
            }
        }
        fetch()
    })

    return {
        data,
        loading,
        error,
        variables: options?.variables
    }
}