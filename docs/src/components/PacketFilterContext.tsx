import React, { createContext, useState } from "react";

export interface PacketFilterProps {
    flags: string[],
    setFlags: (kinds: string[]) => void,
}

const PacketFilterContext = createContext<PacketFilterProps>({
    flags: [],
    setFlags: (k) => { },
});
PacketFilterContext.displayName = "packets";

export default PacketFilterContext;

export const PacketFilterProvider = ({ children }) => {
    const [flags, setFlags] = useState(["console", "rw", "ro", "event", "command", "report"])

    return (
        <PacketFilterContext.Provider value={{
            flags, setFlags,
        }}>
            {children}
        </PacketFilterContext.Provider>
    )
}
