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
}

const DrawerContext = createContext<DrawerProps>({
    drawerType: DrawerType.None,
    setDrawerType: (type) => { },
});
DrawerContext.displayName = "drawer";

export default DrawerContext;

export const DrawerProvider = ({ children }) => {
    const [type, setType] = useState(DrawerType.None)

    return (
        <DrawerContext.Provider value={{
            drawerType: type, 
            setDrawerType: setType,
        }}>
            {children}
        </DrawerContext.Provider>
    )
}

export function drawerTitle(type: DrawerType) {
    switch(type) {
        case DrawerType.Dom:
            return "Connected devices"
        case DrawerType.Packets:
            return "Packet console"
        case DrawerType.ServiceSpecification:
            return "Service Specification"
        default: undefined
    }
}