import React, { createContext, useState, useContext } from "react";

export enum DrawerType {
    None,
    Toc,
    Packets,
    Dom,
    ServiceSpecification
}

export interface DrawerProps {
    drawerType: DrawerType,
    setDrawerType: (type: DrawerType) => void,
    searchQuery: string,
    setSearchQuery: (s: string) => void
}

const DrawerContext = createContext<DrawerProps>({
    drawerType: DrawerType.None,
    setDrawerType: (type) => { },
    searchQuery: undefined,
    setSearchQuery: (s) => { }
});
DrawerContext.displayName = "drawer";

export default DrawerContext;

export const DrawerProvider = ({ children }) => {
    const [type, setType] = useState(DrawerType.None)
    const [searchQuery, setSearchQuery] = useState('')

    return (
        <DrawerContext.Provider value={{
            drawerType: type,
            setDrawerType: setType,
            searchQuery,
            setSearchQuery
        }}>
            {children}
        </DrawerContext.Provider>
    )
}

export function drawerTitle(type: DrawerType) {
    switch (type) {
        case DrawerType.Dom:
            return "Connected devices"
        case DrawerType.Packets:
            return "Packet console"
        case DrawerType.ServiceSpecification:
            return "Service Specification"
        default: return undefined
    }
}