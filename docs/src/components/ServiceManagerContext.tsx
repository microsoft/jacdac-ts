import React, { createContext } from "react";

export interface ServiceManagerContextProps {
    isHosted: boolean;
}

const ServiceManagerContext = createContext<ServiceManagerContextProps>({
    isHosted: false
});
ServiceManagerContext.displayName = "Services";

export const ServiceManagerProvider = ({ children }) => {
    const isHosted = inIFrame();
    const value = {
        isHosted
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