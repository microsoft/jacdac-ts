import React, { createContext } from "react";
import { BrowserFileStorage, HostedFileStorage, IFileStorage } from '../../../src/embed/filestorage'
import { HTMLIFrameTransport } from "../../../src/embed/transport";

export interface ServiceManagerContextProps {
    isHosted: boolean;
    fileStorage: IFileStorage;
}

const ServiceManagerContext = createContext<ServiceManagerContextProps>({
    isHosted: false,
    fileStorage: new BrowserFileStorage()
});
ServiceManagerContext.displayName = "Services";

export const ServiceManagerProvider = ({ children }) => {
    const isHosted = inIFrame();
    let fileStorage: IFileStorage = new BrowserFileStorage()
    if (isHosted) {
        console.log(`starting hosted services`)
        const transport = new HTMLIFrameTransport()
        fileStorage = new HostedFileStorage(transport)

        // notify host that we are ready
        transport.postReady()
    }
    const value = {
        isHosted,
        fileStorage
    }
    return <ServiceManagerContext.Provider value={value}>
        {children}
    </ServiceManagerContext.Provider>
}

function inIFrame() {
    try {
        return typeof window !== "undefined"
            && window.self !== window.top
    } catch (e) {
        return true;
    }
}

export default ServiceManagerContext;