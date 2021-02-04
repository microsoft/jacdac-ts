import { useContext } from "react";
import JacdacContext, { JDContextProps } from "../../../../src/react/Context";
import useChange from '../../jacdac/useChange';

export default function useServices(options: {
    serviceName?: string;
    serviceClass?: number;
}) {
    const { bus } = useContext<JDContextProps>(JacdacContext)
    const services = useChange(bus, b => b.services(options)
        , [JSON.stringify(options)])
    return services;
}