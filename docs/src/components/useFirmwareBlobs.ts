import { useContext, useEffect, useState } from "react";
import JACDACContext, { JDContextProps } from "../../../src/react/Context";
import { FirmwareBlob, parseFirmwareFile, parseUF2 } from "../../../src/dom/flashing";
import useEffectAsync from "./useEffectAsync";
import DbContext, { DbContextProps } from "./DbContext";
import { useChangeAsync } from "../jacdac/useChange";

export default function useFirmwareBlobs() {
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const { db } = useContext<DbContextProps>(DbContext)
    const firmwares = db?.firmwares;

    useChangeAsync(firmwares, async (fw) => {
        console.log(`import stored uf2`)
        const names = await fw?.list()
        let uf2s: FirmwareBlob[] = [];
        if (names?.length) {
            for (const name of names) {
                const blob = await fw.get(name)
                const uf2Blobs = await parseFirmwareFile(blob, name)
                uf2Blobs?.forEach(uf2Blob => {
                    uf2s.push(uf2Blob)
                })
            }
        }
        bus.firmwareBlobs = uf2s;
    })
}

export function useFirmwareBlob(repoSlug: string) {
    const { db } = useContext<DbContextProps>(DbContext)
    const firmwares = db?.firmwares;

    const blobs = useChangeAsync(firmwares, async (fw) => {
        const blob = await firmwares?.get(repoSlug)
        if (!blob) {
            return undefined;
        } else {
            const uf2Blobs = await parseFirmwareFile(blob, repoSlug)
            return uf2Blobs;
        }
    })

    return {
        firmwareBlobs: blobs,
        setFirmwareFile: async (tag: string, f: Blob) => {
            firmwares?.set(repoSlug, f)
        }
    }
}