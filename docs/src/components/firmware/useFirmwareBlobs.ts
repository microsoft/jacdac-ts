import { useContext } from "react";
import JacdacContext, { JacdacContextProps } from "../../jacdac/Context";
import { FirmwareBlob, parseFirmwareFile } from "../../../../src/jdom/flashing";
import useEffectAsync from "../useEffectAsync";
import DbContext, { DbContextProps } from "../DbContext";
import { useChangeAsync } from "../../jacdac/useChange";
import { deviceSpecifications } from "../../../../src/jdom/spec";
import { delay, unique } from "../../../../src/jdom/utils";
import { fetchLatestRelease, fetchReleaseBinary } from "../github";

export default function useFirmwareBlobs() {
    const { bus } = useContext<JacdacContextProps>(JacdacContext)
    const { db } = useContext<DbContextProps>(DbContext)
    const firmwares = db?.firmwares;
    // run once, go through known firmware repoes and load version
    useEffectAsync(async () => {
        console.log(`firmware: load`)
        const names = await firmwares?.list()
        if (!names) return;

        // wait for 2 minute 
        // before starting any download
        console.log(`firmware: await 2 minutes before checking updates`)
        await delay(120000);

        const missingSlugs = unique(deviceSpecifications()
            .filter(spec => !!spec?.firmwares.length) // needs some firmwares
            .map(spec => spec.repo)
            .filter(repo => /^https:\/\/github.com\//.test(repo))
            .map(repo => repo.substr("https://github.com/".length))
            .filter(slug => names.indexOf(slug) < 0)
        );
        for (const slug of missingSlugs) {
            console.log(`db: fetch latest release of ${slug}`)
            const rel = await fetchLatestRelease(slug, { ignoreThrottled: true })
            if (!rel?.tag_name) {
                console.warn(`release not found`)
                return;
            }

            console.log(`db: fetch binary release ${slug}#${rel.tag_name}`)
            const fw = await fetchReleaseBinary(slug, rel.tag_name)
            if (fw) {
                console.log(`db: binary release ${slug}#${rel.tag_name} downloaded`)
                firmwares.set(slug, fw);
            }
            // throttle github queries
            await delay(5000)
        }
    }, [db])

    useChangeAsync(firmwares, async (fw) => {
        console.log(`firmwares: change`)
        const names = await fw?.list()
        console.log(`import stored uf2`, names)
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

    return bus.firmwareBlobs;
}

export function useFirmwareBlob(repoSlug: string) {
    const { db } = useContext<DbContextProps>(DbContext)
    const firmwares = db?.firmwares;

    const blobs = useChangeAsync(firmwares, async () => {
        if (!repoSlug)
            return undefined;

        const blob = await firmwares?.get(repoSlug)
        if (!blob) {
            return undefined;
        } else {
            const uf2Blobs = await parseFirmwareFile(blob, repoSlug)
            return uf2Blobs;
        }
    }, [repoSlug])

    return {
        firmwareBlobs: blobs,
        setFirmwareFile: async (tag: string, f: Blob) => {
            firmwares?.set(repoSlug, f)
        }
    }
}