import React, { createContext, useState, useEffect, useContext } from "react";
import { delay, JSONTryParse } from "../../../src/dom/utils";

export interface DbStore<T> {
    get: (id: string) => Promise<T>;
    set: (id: string, value: T) => Promise<void>;
    list: () => Promise<string[]>;
}

export interface Db {
    dependencyId: () => number,
    blobs: DbStore<Blob>;
    values: DbStore<string>;
    firmwares: DbStore<Blob>;
}

function openDbAsync(): Promise<Db> {
    const DB_VERSION = 5
    const DB_NAME = "JACDAC"
    const STORE_BLOBS = "BLOBS"
    const STORE_FIRMWARE_BLOBS = "STORE_FIRMWARE_BLOBS"
    const STORE_STORAGE = "STORAGE"
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    let db: IDBDatabase;
    let changeId = 0;
    let upgrading = false;

    const checkUpgrading = () => {
        if (upgrading) return delay(100)
        else return Promise.resolve()
    }
    const set = (table: string, id: string, data: any) => {
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
    const list = (table: string) => {
        return checkUpgrading().then(() => new Promise<any>((resolve, reject) => {
            try {
                const transaction = db.transaction([table], "readonly");
                const blobs = transaction.objectStore(table)
                const request = blobs.getAllKeys()
                request.onsuccess = (event) => resolve((event.target as any).result)
                request.onerror = (event) => resolve((event.target as any).result)
            } catch (e) {
                console.error(`idb: list ${table} failed`)
                reject(e)
            }
        }))
    }

    const api: Db = {
        dependencyId: () => changeId,
        blobs: {
            set: (id: string, blob: Blob): Promise<void> => set(STORE_BLOBS, id, blob),
            get: (id: string): Promise<Blob> => get(STORE_BLOBS, id).then(v => v as Blob),
            list: (): Promise<string[]> => list(STORE_BLOBS).then(v => v as string[]),
        },
        values: {
            set: (id: string, value: string): Promise<void> => set(STORE_STORAGE, id, value),
            get: (id: string): Promise<string> => get(STORE_STORAGE, id).then(v => v as string),
            list: (): Promise<string[]> => list(STORE_BLOBS).then(v => v as string[]),
        },
        firmwares: {
            set: (id: string, blob: Blob): Promise<void> => set(STORE_FIRMWARE_BLOBS, id, blob),
            get: (id: string): Promise<Blob> => get(STORE_FIRMWARE_BLOBS, id).then(v => v as Blob),
            list: (): Promise<string[]> => list(STORE_FIRMWARE_BLOBS).then(v => v as string[]),
        }
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
                if (!stores.contains(STORE_FIRMWARE_BLOBS))
                    db.createObjectStore(STORE_FIRMWARE_BLOBS);
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
