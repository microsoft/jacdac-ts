import React, { useContext, useEffect, useState } from "react";
import { JSONTryParse } from "../../../src/dom/utils";
import useChange, { useChangeAsync } from "../jacdac/useChange";
import DbContext from "./DbContext";
import useEffectAsync from "./useEffectAsync";

export function useDbBlob(blobName: string) {
    const { db } = useContext(DbContext);
    const blobs = db?.blobs;

    const value = useChangeAsync(blobs, b => b?.get(blobName))
    return {
        blob: value,
        setBlob: async (blob: Blob) => { await blobs?.set(blobName, blob) }
    }
}

export function useDbUint8Array(blobName: string) {
    const { blob, setBlob } = useDbBlob(blobName)
    const [model, setModel] = useState<Uint8Array>(undefined)

    useEffectAsync(() => {
        if (!blob) {
            setModel(undefined)
            return Promise.resolve()
        }
        else {
            return new Promise((resolve, reject) => {
                const fileReader = new FileReader();
                fileReader.onload = () => {
                    setModel(new Uint8Array(fileReader.result as ArrayBuffer))
                    resolve()
                }
                fileReader.onerror = (e) => {
                    setModel(undefined)
                    reject(e)
                }
                fileReader.readAsArrayBuffer(blob);
            })
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

    useEffectAsync(() => {
        if (!blob) {
            setModel(undefined)
            return Promise.resolve()
        }
        else {
            return new Promise((resolve, reject) => {
                const fileReader = new FileReader();
                fileReader.onload = () => {
                    setModel(fileReader.result as string)
                    resolve();
                }
                fileReader.onerror = (e) => {
                    setModel(undefined)
                    reject(e)
                }
                fileReader.readAsText(blob);
            })
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
