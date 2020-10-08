import React, { useContext, useEffect, useState } from "react";
import { JSONTryParse, readBlobToText, readBlobToUint8Array } from "../../../src/dom/utils";
import DbContext, { DB_VALUE_CHANGE } from "./DbContext";
import useEffectAsync from "./useEffectAsync";

export function useDbBlob(id: string) {
    const { db } = useContext(DbContext)
    const [_value, _setValue] = useState<Blob>(undefined)
    const values = db?.blobs
    let _mounted = true;

    // listen to change
    useEffect(() => values?.subscribe(DB_VALUE_CHANGE, async (changed) => {
        if (changed === id) {
            const v = await values.get(id)
            if (_mounted && v !== _value) {
                _setValue(v);
            }
        }
        return () => {
            _mounted = false;
        }
    }), [values])

    // load intial value
    useEffectAsync(async (mounted) => {
        const v = await values?.get(id);
        if (mounted())
           _setValue(v)
    }, [values])
    return {
        blob: _value,
        setBlob: async (blob: Blob) => { await values?.set(id, blob) }
    }
}

export function useDbUint8Array(blobName: string) {
    const { blob, setBlob } = useDbBlob(blobName)
    const [model, setModel] = useState<Uint8Array>(undefined)

    useEffectAsync(async () => {
        if (!blob) {
            setModel(undefined)
        }
        else {
            const buf = await readBlobToUint8Array(blob);
            setModel(buf);
        }
    }, [blob])

    return {
        data: model,
        setBlob
    }
}

export function useDbString(blobName: string) {
    const { blob, setBlob } = useDbBlob(blobName)
    const [model, setModel] = useState<string>(undefined)

    useEffectAsync(async () => {
        if (!blob) {
            setModel(undefined)
        }
        else {
            const t = await readBlobToText(blob);
            setModel(t);
        }
    }, [blob])

    return {
        data: model,
        setBlob
    }
}

export function useDbJSON<T>(blobName: string) {
    const { data, setBlob } = useDbString(blobName);
    const value: T = JSONTryParse(data) as T;
    return {
        value,
        setBlob: async (blob: Blob) => {
            await setBlob(blob)
        }
    }
}
