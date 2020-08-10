import React, { createContext, useState, useEffect, useContext } from "react";
import { FirmwareBlob, parseUF2 } from "../../../src/dom/flashing";
import JacdacContext from "../../../src/react/Context";

export interface Db {
    dependencyId: () => number,
    put: (id: string, file: File) => Promise<void>;
    get: (id: string) => Promise<File>;
    del: (id: string) => Promise<void>;
}

function openDbAsync(): Promise<Db> {
    const DB_VERSION = 1
    const DB_NAME = "ASSETS"
    const STORE_FILES = "FILES"
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    let db: IDBDatabase;
    let changeId = 0;

    const api = {
        dependencyId: () => changeId,
        put: (id: string, file: File): Promise<void> => {
            changeId++
            return new Promise<void>((resolve, reject) => {
                try {
                    const transaction = db.transaction([STORE_FILES], "readwrite");
                    const blobs = transaction.objectStore(STORE_FILES)
                    const request = blobs.put(file, id);
                    request.onsuccess = (event) => resolve()
                    request.onerror = (event) => resolve()
                } catch (e) {
                    console.error(`idb: put ${id} failed`)
                    reject(e)
                }
            })
        },
        get: (id: string): Promise<File> => {
            return new Promise<File>((resolve, reject) => {
                try {
                    const transaction = db.transaction([STORE_FILES], "readonly");
                    const blobs = transaction.objectStore(STORE_FILES)
                    const request = blobs.get(id);
                    request.onsuccess = (event) => resolve((event.target as any).result)
                    request.onerror = (event) => resolve((event.target as any).result)
                } catch (e) {
                    console.error(`idb: get ${id} failed`)
                    reject(e)
                }
            })
        },
        del: (id: string): Promise<void> => {
            changeId++
            return new Promise<void>((resolve, reject) => {
                try {
                    const transaction = db.transaction([STORE_FILES], "readwrite");
                    const blobs = transaction.objectStore(STORE_FILES)
                    const request = blobs.delete(id);
                    request.onsuccess = (event) => resolve()
                    request.onerror = (event) => resolve()
                } catch (e) {
                    console.error(`idb: del ${id}`)
                    reject(e)
                }
            })
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
            db = request.result;
            db.createObjectStore(STORE_FILES);
            db.onerror = function (event) {
                console.log("idb error", event);
            };
            resolve(api);
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
    const [file, setFile] = useState<File>(undefined);
    const { db } = useContext(DbContext);

    // runs once
    useEffect(() => {
        if (db)
            db.get(fileName)
                .then(f => setFile(f))
    }, [db, db?.dependencyId()])

    return {
        file,
        setFile: async (f: File) => {
            if (!f)
                await db?.del(fileName)
            else
                await db?.put(fileName, f)
            setFile(f)
        }
    }
}

export function useFirmwareBlobs() {
    const { bus } = useContext(JacdacContext)
    const { file, setFile } = useDbFile("firmware.uf2")

    async function load(f: File, store: boolean) {
        if (f) {
            const buf = new Uint8Array(await f.arrayBuffer())
            const bls = parseUF2(buf);
            // success, store and save in bus
            if (store)
                await setFile(f)
            bus.firmwareBlobs = bls
            console.log(`loaded blobs`, bls)
        } else {
            if (store)
                await setFile(undefined)
            bus.firmwareBlobs = undefined
        }
    }
    useEffect(() => {
        console.log(`import stored uf2`, file)
        load(file, false)
    }, [file])
    return {
        setFirmwareFile: async (file: File) => {
            console.log(`import new uf2`, file)
            await load(file, true)
        }
    }
}
