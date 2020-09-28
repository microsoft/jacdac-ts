import { useContext, useEffect } from "react";
import JACDACContext, { JDContextProps } from "../../../src/react/Context";
import { useDbBlob } from "./useDb";
import { parseUF2 } from "../../../src/dom/flashing";

export default function useFirmwareBlobs() {
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const { blob, setBlob, dependencyId } = useDbBlob("firmware.uf2")

    async function load(f: Blob, store: boolean) {
        if (f) {
            const buf = new Uint8Array(await f.arrayBuffer())
            const bls = parseUF2(buf);
            // success, store and save in bus
            if (store)
                await setBlob(f)
            bus.firmwareBlobs = bls
        } else {
            // delete entry
            if (store)
                await setBlob(undefined)
            bus.firmwareBlobs = undefined
        }
    }
    useEffect(() => {
        console.log(`import stored uf2`)
        blob().then(f => load(f, false))
    }, [dependencyId()])

    return {
        firmwareFileDependencyId: dependencyId(),
        setFirmwareBlob: async (repoSlug: string, tag: string, f: Blob) => {
            console.log(`import new uf2 from ${repoSlug}/${tag}`)
            await load(f, true)
        }
    }
}