import React, { createContext, useState, useContext } from "react";

export enum DrawerType {
    None,
    Toc,
    Packets,
    Dom
}
  
export interface DrawerProps {
    type: DrawerType,
    setType: (type: DrawerType) => void,
}

const DrawerContext = createContext<DrawerProps>({
    type: DrawerType.None,
    setType: (type) => { },
});
DrawerContext.displayName = "drawer";

export default DrawerContext;

export const DrawerProvider = ({ children }) => {
    const [type, setType] = useState(DrawerType.None)

    return (
        <DrawerContext.Provider value={{
            type, setType,
        }}>
            {children}
        </DrawerContext.Provider>
    )
}
