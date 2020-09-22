import React, { createContext, useState } from "react";
import { Packet } from "../../../src/dom/packet";

export interface PacketsProps {
    packets: Packet[],
    setPackets: (packets: Packet[]) => void,
    paused: boolean,
    setPaused: (paused: boolean) => void,
    flags: string[],
    setFlags: (kinds: string[]) => void,
    serviceClass?: number,
    setServiceClass?: (serviceClass: number) => void
}

const PacketsContext = createContext<PacketsProps>({
    packets: [],
    setPackets: (ps) => { },
    paused: false,
    setPaused: (p) => { },
    flags: [],
    setFlags: (k) => { },
    serviceClass: undefined,
    setServiceClass: (srv) => { },
});
PacketsContext.displayName = "packets";

export default PacketsContext;

export const PacketsProvider = ({ children }) => {
    const [packets, setPackets] = useState<Packet[]>([])
    const [paused, setPaused] = useState(false)
    const [flags, setFlags] = useState(["rw", "ro", "event", "command", "report"])
    const [serviceClass, setServiceClass] = useState<number>(undefined)
    return (
        <PacketsContext.Provider value={{
            packets, setPackets,
            paused, setPaused,
            flags, setFlags,
            serviceClass, setServiceClass
        }}>
            {children}
        </PacketsContext.Provider>
    )
}