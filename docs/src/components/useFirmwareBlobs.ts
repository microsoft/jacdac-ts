import { useContext, useEffect } from "react";
import JACDACContext from "../../../src/react/Context";
import { useDbFile } from "./DbContext";
import { parseUF2 } from "../../../src/dom/flashing";

export default function useFirmwareBlobs() {
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