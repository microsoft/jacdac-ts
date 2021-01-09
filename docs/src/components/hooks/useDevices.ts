import { DependencyList, useContext } from "react";
import { DeviceFilter } from "../../../../src/jdom/bus";
import JACDACContext, { JDContextProps } from "../../../../src/react/Context";
import useChange from '../../jacdac/useChange';

export default function useDevices(options?: DeviceFilter, deps: DependencyList = []) {
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const devices = useChange(bus, b => b.devices(options)
        , [JSON.stringify(options), ...deps])
    return devices;
}