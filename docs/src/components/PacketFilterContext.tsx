import React, { createContext, useState } from "react";
import { allKinds } from "./KindIcon";

export interface PacketFilterProps {
    consoleMode: boolean,
    setConsoleMode: (value: boolean) => void,

    kinds: string[],
    setKinds: (kinds: string[]) => void,
}

const PacketFilterContext = createContext<PacketFilterProps>({
    consoleMode: true,
    setConsoleMode: (v) => { },

    kinds: [],
    setKinds: (k) => {},
});
PacketFilterContext.displayName = "packets";

export default PacketFilterContext;

export const PacketFilterProvider = ({ children }) => {
    const [consoleMode, setConsoleMode] = useState(true)
    const [kinds, setKinds] = useState(["rw", "ro", "event", "command"])

    return (
        <PacketFilterContext.Provider value={{
            consoleMode, setConsoleMode,
            kinds, setKinds,
        }}>
            {children}
        </PacketFilterContext.Provider>
    )
}
