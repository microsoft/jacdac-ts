namespace modules {
    /**
     * Persistent key-value storage interface for storing settings.
     **/
    //% fixedInstances blockGap=8
    export class SettingsClient extends jacdac.Client {
            

        constructor(role: string) {
            super(jacdac.SRV_SETTINGS, role);
            
        }
    

        /**
         * Notifies that some setting have been modified.
         */
        //% group="Settings"
        //% weight=100
        onChange(handler: () => void): void {
            this.registerEvent(jacdac.SettingsEvent.Change, handler);
        }

        /**
        * Get the value of given setting. If no such entry exists, the value returned is empty.
        */
        //% group="Settings"
        //% weight=99
        get(key: string): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.jdpacked(jacdac.SettingsCmd.Get, "s", [key]))
        }

        /**
        * Set the value of a given setting.
        */
        //% group="Settings"
        //% weight=98
        set(key: string, value: Buffer): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.jdpacked(jacdac.SettingsCmd.Set, "z b", [key, value]))
        }

        /**
        * Delete a given setting.
        */
        //% group="Settings"
        //% weight=97
        delete(key: string): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.jdpacked(jacdac.SettingsCmd.Delete, "s", [key]))
        }

        /**
        * Clears all keys.
        */
        //% group="Settings"
        //% weight=96
        clear(): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.onlyHeader(jacdac.SettingsCmd.Clear))
        }
    
    }
    //% fixedInstance whenUsed
    export const settings = new SettingsClient("settings");
}