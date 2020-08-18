import React, { createContext, useState } from "react";

export interface PacketFilterProps {
    flags: string[],
    setFlags: (kinds: string[]) => void,
    serviceClass?: number,
    setServiceClass?: (serviceClass: number) => void,
}

const PacketFilterContext = createContext<PacketFilterProps>({
    flags: [],
    setFlags: (k) => { },
    serviceClass: undefined,
    setServiceClass: (srv) => { },
});
PacketFilterContext.displayName = "packets";

export default PacketFilterContext;

export const PacketFilterProvider = ({ children }) => {
    const [flags, setFlags] = useState(["console", "rw", "ro", "event", "command", "report"])
    const [serviceClass, setServiceClass] = useState<number>(undefined)
    return (
        <PacketFilterContext.Provider value={{
            flags, setFlags, serviceClass, setServiceClass
        }}>
            {children}
        </PacketFilterContext.Provider>
    )
}
