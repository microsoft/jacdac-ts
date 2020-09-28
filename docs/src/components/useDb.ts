import React, { useContext, useEffect, useState } from "react";
import { JSONTryParse } from "../../../src/dom/utils";
import DbContext from "./DbContext";

export function useDbBlob(blobName: string) {
    const { db } = useContext(DbContext);

    return {
        dependencyId: () => db?.dependencyId(),
        blob: () => db?.getBlob(blobName) || Promise.resolve(undefined),
        setBlob: async (blob: Blob) => { await db?.putBlob(blobName, blob) },
        listBlobs: async (query?: string) => db?.listBlobs(query)
    }
}

export function useDbUint8Array(blobName: string) {
    const { blob, setBlob, dependencyId } = useDbBlob(blobName)
    const [model, setModel] = useState<Uint8Array>(undefined)

    useEffect(() => {
        blob().then((data: Blob) => {
            if (!data) setModel(undefined)
            else {
                const fileReader = new FileReader();
                fileReader.readAsArrayBuffer(data);
                fileReader.onload = () => setModel(new Uint8Array(fileReader.result as ArrayBuffer))
            }
        })
    }, [dependencyId()])

    return {
        data: model,
        setBlob
    }
}

export function useDbString(blobName: string) {
    const { blob, setBlob, dependencyId } = useDbBlob(blobName)
    const [model, setModel] = useState<string>(undefined)

    useEffect(() => {
        blob().then((data: Blob) => {
            if (!data) setModel(undefined)
            else {
                const fileReader = new FileReader();
                console.log(data)
                fileReader.readAsText(data);
                fileReader.onload = () => {
                    console.log(fileReader)
                    setModel(fileReader.result as string)
                }
            }
        })
    }, [dependencyId()])

    return {
        data: model,
        setBlob
    }
}

export function useDbJSON<T>(blobName: string) {
    const { data, setBlob } = useDbString(blobName);
    const value: T = JSONTryParse(data) as T;
    console.log(`data`, data, value)
    return {
        value,
        setBlob: async (blob: Blob) => {
            console.log(`setJSONblob`, blob);
            await setBlob(blob)
        }
    }
}
