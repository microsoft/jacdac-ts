import { useState } from "react";
import useEffectAsync from "./useEffectAsync";

export default function useFetch<T>(url: RequestInfo, options?: RequestInit) {
    const [response, setResponse] = useState<T>(undefined);
    const [error, setError] = useState<any>(undefined);
    const [status, setStatus] = useState<number>(undefined);
    const [loading, setLoading] = useState(true); // start in loading mode

    useEffectAsync(async (mounted) => {
        setLoading(true);
        try {
            const res = await fetch(url, options);
            if (!mounted())
                return;
            const status = res.status;
            setStatus(status);
            if (status >= 200 && status <= 204) {
                const json = await res.json();
                if (!mounted())
                    return;
                setResponse(json);
            }
        } catch (error) {
            if (!mounted())
                return;
            setError(error);
        }
        finally {
            if (!mounted())
                return;
            setLoading(false)
        }
    }, [url]);

    return {
        response,
        error,
        status,
        loading
    };
};