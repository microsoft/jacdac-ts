import { useContext } from "react";
import JACDACContext, { JDContextProps } from "../../../../src/react/Context";
import useChange from '../../jacdac/useChange';

export default function useDevices(options: {
    serviceName?: string;
    serviceClass?: number;
    ignoreSelf?: boolean;
    announced?: boolean;
}) {
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const devices = useChange(bus, b =>
        b.devices(options)
            .filter(dev => !options?.ignoreSelf || dev.deviceId !== bus.selfDeviceId)
            .filter(dev => !options?.announced || dev.announced)
        , [JSON.stringify(options)])
    return devices;
}