import React, { createContext, useState, useEffect, useContext } from "react";
import { delay, JSONTryParse } from "../../../src/dom/utils";

export interface Db {
    dependencyId: () => number,
    getBlob: (id: string) => Promise<Blob>;
    putBlob: (id: string, blob: Blob) => Promise<void>;
    getValue: (id: string) => Promise<string>;
    putValue: (id: string, value: string) => Promise<void>;
}

function openDbAsync(): Promise<Db> {
    const DB_VERSION = 3
    const DB_NAME = "JACDAC"
    const STORE_BLOBS = "BLOBS"
    const STORE_STORAGE = "STORAGE"
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    let db: IDBDatabase;
    let changeId = 0;
    let upgrading = false;

    const checkUpgrading = () => {
        if (upgrading) return delay(100)
        else return Promise.resolve()
    }
    const put = (table: string, id: string, data: any) => {
        changeId++
        return checkUpgrading().then(() => new Promise<void>((resolve, reject) => {
            try {
                const transaction = db.transaction([table], "readwrite");
                const blobs = transaction.objectStore(table)
                const request = data !== undefined ? blobs.put(data, id) : blobs.delete(id);;
                request.onsuccess = (event) => resolve()
                request.onerror = (event) => resolve()
            } catch (e) {
                console.error(`idb: put ${id} failed`)
                reject(e)
            }
        }))
    }
    const get = (table: string, id: string) => {
        return checkUpgrading().then(() => new Promise<any>((resolve, reject) => {
            try {
                const transaction = db.transaction([table], "readonly");
                const blobs = transaction.objectStore(table)
                const request = blobs.get(id);
                request.onsuccess = (event) => resolve((event.target as any).result)
                request.onerror = (event) => resolve((event.target as any).result)
            } catch (e) {
                console.error(`idb: get ${id} failed`)
                reject(e)
            }
        }))
    }

    const api = {
        dependencyId: () => changeId,
        putBlob: (id: string, blob: Blob): Promise<void> => put(STORE_BLOBS, id, blob),
        getBlob: (id: string): Promise<Blob> => get(STORE_BLOBS, id).then(v => v as Blob),
        putValue: (id: string, value: string): Promise<void> => put(STORE_STORAGE, id, value),
        getValue: (id: string): Promise<string> => get(STORE_STORAGE, id).then(v => v as string),
    }

    return new Promise((resolve, reject) => {
        // create or upgrade database
        request.onsuccess = function (event) {
            db = request.result;
            db.onerror = function (event) {
                console.log("idb error", event);
            };
            resolve(api);
        }
        request.onupgradeneeded = function (event) {
            upgrading = true;
            try {
                db = request.result;
                const stores = db.objectStoreNames
                if (!stores.contains(STORE_STORAGE))
                    db.createObjectStore(STORE_STORAGE);
                if (!stores.contains(STORE_BLOBS))
                    db.createObjectStore(STORE_BLOBS);
                db.onerror = function (event) {
                    console.log("idb error", event);
                };
            } finally {
                upgrading = false;
            }
        };
    })
}


export interface DbContextProps {
    db: Db,
    error: any
}

const DbContext = createContext<DbContextProps>({
    db: undefined,
    error: undefined
});
DbContext.displayName = "db";

export default DbContext;

export const DbProvider = ({ children }) => {
    const [db, SetDb] = useState<Db>(undefined)
    const [error, setError] = useState(undefined)
    useEffect(() => {
        openDbAsync()
            .then(d => SetDb(d))
            .catch(e => setError(error))
    }, []);
    return (
        <DbContext.Provider value={{ db, error }}>
            {children}
        </DbContext.Provider>
    )
}

export function useDbBlob(blobName: string) {
    const { db } = useContext(DbContext);

    return {
        dependencyId: () => db?.dependencyId(),
        blob: () => db?.getBlob(blobName) || Promise.resolve(undefined),
        setBlob: async (blob: Blob) => { await db?.putBlob(blobName, blob) }
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