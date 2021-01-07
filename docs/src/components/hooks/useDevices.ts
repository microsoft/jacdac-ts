import { useContext } from "react";
import JACDACContext, { JDContextProps } from "../../../../src/react/Context";
import useChange from '../../jacdac/useChange';

export default function useDevices(options: {
    serviceName?: string;
    serviceClass?: number;
    ignoreSelf?: boolean;
    announced?: boolean;
}) {
    const { serviceName, serviceClass, ignoreSelf, announced } = (options || {});
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const devices = useChange(bus, b =>
        b.devices(options)
            .filter(dev => !ignoreSelf || dev.deviceId !== bus.selfDeviceId)
            .filter(dev => !announced || dev.announced)
        , [serviceName, serviceClass, ignoreSelf, announced])
    return devices;
}