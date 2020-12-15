import { useSnackbar } from "notistack";
import React, { createContext, useContext, useEffect, useState } from "react";
import { BusState } from "../../../src/jdom/bus";
import { CONNECTION_STATE, ERROR } from "../../../src/jdom/constants";
import { isCancelError } from "../../../src/jdom/utils";
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
    setError: (error: any) => void,
    widgetMode: boolean
}

const AppContext = createContext<AppProps>({
    drawerType: DrawerType.None,
    setDrawerType: (type) => { },
    searchQuery: undefined,
    setSearchQuery: (s) => { },
    toolsMenu: false,
    setToolsMenu: (v) => { },
    setError: (error: any) => { },
    widgetMode: false
});
AppContext.displayName = "app";

export default AppContext;

export const AppProvider = ({ children }) => {
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const [type, setType] = useState(DrawerType.None)
    const [searchQuery, setSearchQuery] = useState('')
    const [toolsMenu, _setToolsMenu] = useState(false)
    const { enqueueSnackbar } = useSnackbar();
    const widgetMode = typeof window !== "undefined" && /widget=1/.test(window.location.href);

    const setError = (e: any) => {
        if (isCancelError(e))
            return;
        const msg = e?.message || (e + "");
        enqueueSnackbar(msg, {
            variant: 'error'
        })
    }

    const setDrawerType = (type: DrawerType) => {
        if (type !== DrawerType.None)
            _setToolsMenu(false);
        setType(type)
    }

    const setToolsMenu = (open: boolean) => {
        if (open)
            setType(DrawerType.None)
        _setToolsMenu(open)
    }

    // notify errors
    useEffect(() => bus.subscribe(ERROR, (e: { exception: Error }) => {
        if (isCancelError(e.exception))
            return;
        setError(e.exception.message)
    }), [])

    useEffect(() => bus.subscribe(CONNECTION_STATE, cs => {
        switch (cs) {
            case BusState.Connected:
                if (!!bus.transport)
                    enqueueSnackbar("connected...", {
                        variant: "info"
                    })
                break;
        }
    }), [])

    return (
        <AppContext.Provider value={{
            drawerType: type,
            setDrawerType,
            searchQuery,
            setSearchQuery,
            toolsMenu,
            setToolsMenu,
            setError,
            widgetMode
        }}>
            {children}
        </AppContext.Provider>
    )
}