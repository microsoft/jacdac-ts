import React, { createContext, useState, useEffect, useContext } from "react";
import { parseUF2 } from "../../../src/dom/flashing";
import JACDACContext from "../../../src/react/Context";
import { delay } from "../../../src/dom/utils";

export interface Db {
    dependencyId: () => number,
    getFile: (id: string) => Promise<File>;
    putFile: (id: string, file: File) => Promise<void>;
    getValue: (id: string) => Promise<string>;
    putValue: (id: string, value: string) => Promise<void>;
}

function openDbAsync(): Promise<Db> {
    const DB_VERSION = 2
    const DB_NAME = "JACDAC"
    const STORE_FILES = "FILES"
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
        putFile: (id: string, file: File): Promise<void> => put(STORE_FILES, id, file),
        getFile: (id: string): Promise<File> => get(STORE_FILES, id).then(v => v as File),
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
                if (!stores.contains(STORE_FILES))
                    db.createObjectStore(STORE_FILES);
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

export function useDbFile(fileName: string) {
    const { db } = useContext(DbContext);

    return {
        dependencyId: () => db?.dependencyId(),
        file: () => db?.getFile(fileName) || Promise.resolve(undefined),
        setFile: async (f: File) => { await db?.putFile(fileName, f) }
    }
}

export function useDbValue(id: string, initialValue: string) {
    const { db } = useContext(DbContext)
    const [_value, _setValue] = useState<string>(undefined)
    useEffect(() => {
        db?.getValue(id)
            .then(v => {
                if (v === undefined) {
                    v = initialValue
                    db?.putValue(id, v)
                }
                _setValue(v)
            })
    }, [db])
    return {
        value: _value,
        setValue: (value: string) => {
            db?.putValue(id, value)
                .then(() => _setValue(value))
        }
    }
}

export function useFirmwareBlobs() {
    const { bus } = useContext(JACDACContext)
    const { file, setFile, dependencyId } = useDbFile("firmware.uf2")

    async function load(f: File, store: boolean) {
        if (f) {
            const buf = new Uint8Array(await f.arrayBuffer())
            const bls = parseUF2(buf);
            // success, store and save in bus
            if (store)
                await setFile(f)
            bus.firmwareBlobs = bls
        } else {
            // delete entry
            if (store)
                await setFile(undefined)
            bus.firmwareBlobs = undefined
        }
    }
    useEffect(() => {
        console.log(`import stored uf2`)
        file().then(f => load(f, false))
    }, [dependencyId()])
    return {
        setFirmwareFile: async (f: File) => {
            console.log(`import new uf2`)
            await load(f, true)
        }
    }
}
