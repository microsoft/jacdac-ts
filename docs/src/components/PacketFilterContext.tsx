import React, { createContext, useState } from "react";

export interface PacketFilterProps {
    consoleMode: boolean,
    setConsoleMode: (value: boolean) => void,

    kinds: string[],
    setKinds: (kinds: string[]) => void,

    skipRepeatedAnnounce: boolean,
    setSkipRepeatedAnnounce: (value: boolean) => void
}

const PacketFilterContext = createContext<PacketFilterProps>({
    consoleMode: true,
    setConsoleMode: (v) => { },

    kinds: [],
    setKinds: (k) => {},

    skipRepeatedAnnounce: false,
    setSkipRepeatedAnnounce: (v) => { }
});
PacketFilterContext.displayName = "packets";

export default PacketFilterContext;

export const PacketFilterProvider = ({ children }) => {
    const [consoleMode, setConsoleMode] = useState(true)
    const [skipRepeatedAnnounce, setSkipRepeatedAnnounce] = useState(false)
    const [kinds, setKinds] = useState(["rw", "ro", "const", "event", "command"])

    return (
        <PacketFilterContext.Provider value={{
            consoleMode, setConsoleMode,
            kinds, setKinds,
            skipRepeatedAnnounce, setSkipRepeatedAnnounce
        }}>
            {children}
        </PacketFilterContext.Provider>
    )
}

