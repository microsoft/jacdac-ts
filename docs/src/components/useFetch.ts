import { DependencyList, useEffect, useState } from "react";

export default function useFetch<T>(url: RequestInfo, options?: RequestInit, deps?: DependencyList) {
    const [response, setResponse] = useState<T>(undefined);
    const [error, setError] = useState<any>(undefined);
    const [status, setStatus] = useState<number>(undefined);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await fetch(url, options);
                const status = res.status;
                setStatus(status);
                if (status >= 200 && status <= 204) {
                    const json = await res.json();
                    setResponse(json);
                }
            } catch (error) {
                setError(error);
            }
            finally {
                setLoading(false)
            }
        };
        fetchData();
    }, deps || []);

    return {
        response,
        error,
        status,
        loading
    };
};