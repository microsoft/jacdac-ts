import React, { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { JSONTryParse, SMap } from "../../../src/dom/utils";
import { BrowserFileStorage, HostedFileStorage, IFileStorage } from '../../../src/embed/filestorage'
import { IThemeMessage } from "../../../src/embed/protocol";
import { ModelStore, HostedModelStore } from "../../../src/embed/modelstore";
import { IFrameTransport } from "../../../src/embed/transport";
import DarkModeContext from "./DarkModeContext";
import JACDACContext, { JDContextProps } from '../../../src/react/Context';
import { JDDevice } from "../../../src/dom/device";
import { IDeviceNameSettings } from "../../../src/dom/bus"
import { inIFrame } from "../../../src/dom/iframeclient";

export interface ISettings {
    get(key: string): string;
    set(key: string, value: string): void;
    clear(): void;
}

export class LocalStorageSettings implements ISettings {
    private live: SMap<string>
    constructor(private readonly key: string) {
        this.live = JSONTryParse(typeof window !== "undefined"
            && window.localStorage.getItem(key)) || {}
    }
    get(key: string): string {
        return this.live[key]
    }
    set(key: string, value: string): void {
        if (value === undefined || value === null)
            delete this.live[key]
        else
            this.live[key] = value;
        if (typeof window !== "undefined")
            window.localStorage.setItem(this.key, JSON.stringify(this.live, null, 2))
    }
    clear() {
        this.live = {}
        if (typeof window !== "undefined")
            window.localStorage.removeItem(this.key)
    }
}

class LocalStorageDeviceNameSettings implements IDeviceNameSettings {
    constructor(private readonly settings: ISettings) { }
    resolve(device: JDDevice): string {
        return this.settings.get(device.deviceId)
    }
    notifyUpdate(device: JDDevice, name: string): void {
        this.settings.set(device.deviceId, name)
    }
}

export interface ServiceManagerContextProps {
    isHosted: boolean;
    fileStorage: IFileStorage;
    modelStore: ModelStore;
}

const ServiceManagerContext = createContext<ServiceManagerContextProps>({
    isHosted: false,
    fileStorage: null,
    modelStore: null
});
ServiceManagerContext.displayName = "Services";

export const ServiceManagerProvider = ({ children }) => {
    const { toggleDarkMode } = useContext(DarkModeContext)
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const props = useRef<ServiceManagerContextProps>(createProps())

    const handleMessage = (ev: MessageEvent<any>) => {
        const msg = ev.data;
        if (msg?.source !== 'jacdac')
            return;
        switch (msg.type) {
            case 'theme': {
                const themeMsg = msg as IThemeMessage
                toggleDarkMode(themeMsg.data.type);
                break;
            }
        }
    }

    // receiving messages
    useEffect(() => {
        if (typeof window !== "undefined") {
            window.addEventListener('message', handleMessage, false)
            return () => window.removeEventListener('message', handleMessage);
        }
        return () => { };
    }, [])

    return <ServiceManagerContext.Provider value={props.current}>
        {children}
    </ServiceManagerContext.Provider>

    function createProps(): ServiceManagerContextProps {
        const isHosted = inIFrame();
        let fileStorage: IFileStorage = new BrowserFileStorage()
        let deviceNames = new LocalStorageDeviceNameSettings(
            new LocalStorageSettings("jacdac_device_names")
        );
        bus.host.deviceNameSettings = deviceNames;
        let modelStore: ModelStore = undefined;
        if (isHosted) {
            console.log(`starting hosted services`)
            const transport = new IFrameTransport(bus)
            fileStorage = new HostedFileStorage(transport)
            modelStore = new HostedModelStore(transport);

            // notify host that we are ready
            transport.postReady()
        }
        return {
            isHosted,
            fileStorage,
            modelStore
        }
    }
}

export default ServiceManagerContext;