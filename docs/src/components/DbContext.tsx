import React, { createContext, useState, useEffect } from "react";

export interface Db {
    put: (id: string, file: File) => void;
    get: (id: string) => Promise<File>;
    del: (id: string) => Promise<void>;
}

function openDbAsync(): Promise<Db> {
    const DB_VERSION = 1
    const DB_NAME = "ASSETS"
    const STORE_FILES = "FILES"
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    let db: IDBDatabase;

    const api = {
        put: (id: string, file: File) => {
            try {
                const transaction = db.transaction([STORE_FILES], "readwrite");
                const blobs = transaction.objectStore(STORE_FILES)
                blobs.put(file, id);
            } catch (e) {
                console.error(`idb: put ${id} failed`)
            }
        },
        get: (id: string): Promise<File> => {
            return new Promise((resolve, reject) => {
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
            return new Promise((resolve, reject) => {
                try {
                    const transaction = db.transaction([STORE_FILES], "readwrite");
                    const blobs = transaction.objectStore(STORE_FILES)
                    const request = blobs.delete(id);
                    request.onsuccess = (event) => resolve((event.target as any).result)
                    request.onerror = (event) => resolve((event.target as any).result)
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
