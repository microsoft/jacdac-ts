import { useContext, useEffect, useState } from "react";
import JACDACContext, { JDContextProps } from "../../../src/react/Context";
import { FirmwareBlob, parseFirmwareFile, parseUF2 } from "../../../src/dom/flashing";
import useEffectAsync from "./useEffectAsync";
import DbContext, { DbContextProps } from "./DbContext";

export default function useFirmwareBlobs() {
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const { db } = useContext<DbContextProps>(DbContext)
    const firmwares = db?.firmwares;

    useEffectAsync(async () => {
        console.log(`import stored uf2`)
        const names = await firmwares?.list()
        let uf2s: FirmwareBlob[] = [];
        if (names?.length) {
            for (const name of names) {
                const blob = await firmwares?.get(name)
                const uf2Blobs = await parseFirmwareFile(blob, name)
                uf2Blobs?.forEach(uf2Blob => {
                    uf2s.push(uf2Blob)
                })
            }
        }
        bus.firmwareBlobs = uf2s;
    }, [firmwares, db?.dependencyId()])
}

export function useFirmwareBlob(repoSlug: string) {
    const { db } = useContext<DbContextProps>(DbContext)
    const firmwares = db?.firmwares;
    const [blobs, setBlobs] = useState<FirmwareBlob[]>(undefined)

    useEffectAsync(async () => {
        const blob = await firmwares?.get(repoSlug)
        if (!blob) {
            setBlobs(undefined)
        } else {
            const uf2Blobs = await parseFirmwareFile(blob, repoSlug)
            setBlobs(uf2Blobs)
        }
    }, [firmwares, db?.dependencyId()])

    return {
        firmwareBlobs: blobs,
        setFirmwareFile: async (tag: string, f: Blob) => {
            firmwares?.set(repoSlug, f)
        }
    }
}