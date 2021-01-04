import { useContext, useState } from "react";
import { deviceSpecificationFromFirmwareIdentifier, deviceSpecifications } from "../../../src/jdom/spec";
import JACDACContext, { JDContextProps } from "../../../src/react/Context";
import useEffectAsync from "./useEffectAsync";
import { unique } from "../../../src/jdom/utils";
import { ControlReg, DEVICE_CHANGE } from "../../../src/jdom/constants";
import useEventRaised from "../jacdac/useEventRaised";

export default function useFirmwareRepos(showAllRepos?: boolean) {
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const [repos, setRepos] = useState<string[]>([])

    const devices = useEventRaised(DEVICE_CHANGE, bus, () => bus.devices().filter(dev => dev.announced))
    const registers = devices.map(device => device?.service(0)?.register(ControlReg.FirmwareIdentifier))
        .filter(reg => !!reg);
    useEffectAsync(async (mounted) => {
        let repos: string[] = [];
        if (showAllRepos)
            repos = deviceSpecifications().map(spec => spec.repo);
        else {
            for (const register of registers) {
                await register.refresh(true)
                const firmwareIdentifier = register.intValue;
                const deviceSpec = deviceSpecificationFromFirmwareIdentifier(firmwareIdentifier)
                if (deviceSpec)
                    repos.push(deviceSpec.repo)
            }
        }
        repos = unique(repos);
        if (mounted)
            setRepos(repos)
    }, [registers.map(reg => reg.id).join(';'), showAllRepos])
    return repos;
}