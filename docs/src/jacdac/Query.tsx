import { useContext, useState, useEffect, useCallback } from "react";
import JacdacContext from "./Context";
import { queryAsync} from "../../../src/graphql"

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

export interface PromiseState<T> {
    promise?: Promise<T>;
    result?: T;
    exception?: any;
}

// https://usehooks.com/useAsync/
export function useQuery<TData = any, TVariables = OperationVariables>(
    query: string,
    options?: QueryHookOptions<TData, TVariables>,
): QueryResult<TData, TVariables> {
    const ctx = useContext(JacdacContext);
    const [pending, setPending] = useState(false);
    const [value, setValue] = useState(null);
    const [error, setError] = useState(null);

    // The execute function wraps asyncFunction and
    // handles setting state for pending, value, and error.
    // useCallback ensures the below useEffect is not called
    // on every render, but only if asyncFunction changes.
    const execute = useCallback(() => {
        setPending(true);
        setValue(null);
        setError(null);
        return queryAsync(ctx.bus, query)
            .then(response => setValue(response))
            .catch(error => setError(error))
            .finally(() => setPending(false));
    }, [query]);

    // Call execute if we want to fire it right away.
    // Otherwise execute can be called later, such as
    // in an onClick handler.
    useEffect(() => {
        execute();
    }, [execute]);

    const r = {
        data: value?.data,
        loading: pending,
        error: error,
        variables: options?.variables
    }
    return r;
};
