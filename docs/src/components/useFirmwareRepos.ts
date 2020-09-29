import { useContext, useState } from "react";
import { deviceSpecificationFromClassIdenfitier } from "../../../src/dom/spec";
import JACDACContext, { JDContextProps } from "../../../src/react/Context";
import useEffectAsync from "./useEffectAsync";
import { unique } from "../../../src/dom/utils";
import { LOCAL_FILE_SLUG } from "./FirmwareCard";
import { CtrlReg, DEVICE_CHANGE, SRV_CTRL } from "../../../src/dom/constants";
import useEventRaised from "../jacdac/useEventRaised";

export default function useFirmwareRepos() {
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const [repos, setRepos] = useState<string[]>([])

    const devices = useEventRaised(DEVICE_CHANGE, bus, () => bus.devices().filter(dev => dev.announced))
    const registers = devices.map(device => device.services({ serviceClass: SRV_CTRL })[0])?.map(srv => srv.register(CtrlReg.DeviceClass))
        .filter(reg => !!reg);
    useEffectAsync(async () => {
        const repos: string[] = [];
        for (const register of registers) {
            await register.sendGetAsync()
            const deviceClass = register.intValue;
            const deviceSpec = deviceSpecificationFromClassIdenfitier(deviceClass)
            if (deviceSpec)
                repos.push(deviceSpec.repo)
        }
        repos.push(LOCAL_FILE_SLUG)
        setRepos(unique(repos))
    }, [registers.map(reg => reg.id).join(';')])
    return repos;
}