import React, { createContext, useState } from "react";

export interface PacketFilterProps {
    consoleMode?: boolean,
    skipRepeatedAnnounce?: boolean,
    setConsoleMode: (value: boolean) => void,
    setSkipRepeatedAnnounce: (value: boolean) => void
}

const PacketFilterContext = createContext<PacketFilterProps>({
    consoleMode: true,
    setConsoleMode: (v) => { },
    setSkipRepeatedAnnounce: (v) => { }
});
PacketFilterContext.displayName = "packets";

export default PacketFilterContext;

export const PacketFilterProvider = ({ children }) => {
    const [consoleMode, setConsoleMode] = useState(true)
    const [skipRepeatedAnnounce, setSkipRepeatedAnnounce] = useState(false)

    console.log({consoleMode, skipRepeatedAnnounce})
    return (
        <PacketFilterContext.Provider value={{
            consoleMode, setConsoleMode,
            skipRepeatedAnnounce, setSkipRepeatedAnnounce
        }}>
            {children}
        </PacketFilterContext.Provider>
    )
}

