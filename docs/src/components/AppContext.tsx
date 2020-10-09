import { useSnackbar } from "notistack";
import React, { createContext, useContext, useEffect, useState } from "react";
import { BusState } from "../../../src/dom/bus";
import { CONNECTION_STATE, ERROR } from "../../../src/dom/constants";
import { isCancelError } from "../../../src/dom/utils";
import JACDACContext, { JDContextProps } from "../../../src/react/Context";

export enum DrawerType {
    None,
    Toc,
    Packets,
    Dom,
    ServiceSpecification
}

export interface AppProps {
    drawerType: DrawerType,
    setDrawerType: (type: DrawerType) => void,
    searchQuery: string,
    setSearchQuery: (s: string) => void,
    toolsMenu: boolean,
    setToolsMenu: (visible: boolean) => void,
    setError: (error: any) => void
}

const AppContext = createContext<AppProps>({
    drawerType: DrawerType.None,
    setDrawerType: (type) => { },
    searchQuery: undefined,
    setSearchQuery: (s) => { },
    toolsMenu: false,
    setToolsMenu: (v) => { },
    setError: (error: any) => { }
});
AppContext.displayName = "app";

export default AppContext;

export const AppProvider = ({ children }) => {
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const [type, setType] = useState(DrawerType.None)
    const [searchQuery, setSearchQuery] = useState('')
    const [toolsMenu, setToolsMenu] = useState(false)
    const { enqueueSnackbar } = useSnackbar();

    const setError = (e: any) => {
        const msg = e?.message || (e + "");
        enqueueSnackbar(msg, {
            variant: 'error'
        })
    }

    // notify errors
    useEffect(() => bus.subscribe(ERROR, (e: { exception: Error }) => {
        if (isCancelError(e.exception))
            return;
        setError(e.exception.message)
    }), [bus])

    useEffect(() => bus.subscribe(CONNECTION_STATE, cs => {
        switch (cs) {
            case BusState.Connected:
                enqueueSnackbar("connected...", {
                    variant: "info"
                })
        }
    }), [bus])

    return (
        <AppContext.Provider value={{
            drawerType: type,
            setDrawerType: setType,
            searchQuery,
            setSearchQuery,
            toolsMenu,
            setToolsMenu,
            setError
        }}>
            {children}
        </AppContext.Provider>
    )
}

export function drawerTitle(type: DrawerType) {
    switch (type) {
        case DrawerType.Dom:
            return "Devices"
        case DrawerType.Packets:
            return "Packets"
        case DrawerType.ServiceSpecification:
            return "Service Specification"
        default: return undefined
    }
}