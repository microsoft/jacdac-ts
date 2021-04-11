namespace modules {
    /**
     * Assign roles to services on the Jacdac bus.
     * 
     * Internally, the role manager stores a mapping from `(device_id, service_idx)` to role name.
     * Users refer to services by using role names (eg., they instantiate an accelerometer client with a given role name).
     * Each client has a role, and roles are unique to clients
     * (ie., one should not have both a gyro and accelerometer service with role `left_leg`).
     * 
     * Role names can be hierarchical, using slash character as a separator.
     * Examples: `left_leg/acc`, `left_leg/gyro`, `right_leg/acc`.
     * If two roles share the prefix before first slash, it should be used as a hint that the services
     * should be co-located on a single device
     * (eg., here the `left_leg` "location" is expected to have both an accelerometer and a gyro service on a single device).
     **/
    //% fixedInstances blockGap=8
    export class RoleManagerClient extends jacdac.Client {

        private readonly _autoBind : jacdac.RegisterClient<[boolean]>;
        private readonly _allRolesAllocated : jacdac.RegisterClient<[boolean]>;            

        constructor(role: string) {
            super(jacdac.SRV_ROLE_MANAGER, role);

            this._autoBind = this.addRegister<[boolean]>(jacdac.RoleManagerReg.AutoBind, "u8");
            this._allRolesAllocated = this.addRegister<[boolean]>(jacdac.RoleManagerReg.AllRolesAllocated, "u8");            
        }
    

        /**
        * Normally, if some roles are unfilled, and there are idle services that can fulfill them,
        * the brain device will assign roles (bind) automatically.
        * Such automatic assignment happens every second or so, and is trying to be smart about 
        * co-locating roles that share "host" (part before first slash),
        * as well as reasonably stable assignments.
        * Once user start assigning roles manually using this service, auto-binding should be disabled to avoid confusion.
        */
        //% callInDebugger
        //% group="Role Manager"
        //% weight=100
        autoBind(): boolean {
            this.start();            
            const values = this._autoBind.pauseUntilValues() as any[];
            return !!values[0];
        }

        /**
        * Normally, if some roles are unfilled, and there are idle services that can fulfill them,
        * the brain device will assign roles (bind) automatically.
        * Such automatic assignment happens every second or so, and is trying to be smart about 
        * co-locating roles that share "host" (part before first slash),
        * as well as reasonably stable assignments.
        * Once user start assigning roles manually using this service, auto-binding should be disabled to avoid confusion.
        */
        //% group="Role Manager"
        //% weight=99
        //% value.defl=1
        setAutoBind(value: boolean) {
            this.start();
            const values = this._autoBind.values as any[];
            values[0] = value ? 1 : 0;
            this._autoBind.values = values as [boolean];
        }

        /**
        * Indicates if all required roles have been allocated to devices.
        */
        //% callInDebugger
        //% group="Role Manager"
        //% weight=98
        allRolesAllocated(): boolean {
            this.start();            
            const values = this._allRolesAllocated.pauseUntilValues() as any[];
            return !!values[0];
        }

        /**
         * Emit notifying that the internal state of the service changed.
         */
        //% group="Role Manager"
        //% blockId=jacdac_on_rolemanager_change
        //% block="on %rolemanager change"
        //% weight=97
        onChange(handler: () => void): void {
            this.registerEvent(jacdac.RoleManagerEvent.Change, handler);
        }

        /**
        * Get the role corresponding to given device identifer. Returns empty string if unset.
        */
        //% group="Role Manager"
        //% blockId=jacdac_rolemanager_get_role_cmd
        //% block="%rolemanager get role"
        //% weight=96
        getRole(deviceId: Buffer, serviceIdx: number): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.jdpacked(jacdac.RoleManagerCmd.GetRole, "b[8] u8", [deviceId, serviceIdx]))
        }

        /**
        * Set role. Can set to empty to remove role binding.
        */
        //% group="Role Manager"
        //% blockId=jacdac_rolemanager_set_role_cmd
        //% block="%rolemanager set role"
        //% weight=95
        setRole(deviceId: Buffer, serviceIdx: number, role: string): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.jdpacked(jacdac.RoleManagerCmd.SetRole, "b[8] u8 s", [deviceId, serviceIdx, role]))
        }

        /**
        * Remove all role bindings.
        */
        //% group="Role Manager"
        //% blockId=jacdac_rolemanager_clear_all_roles_cmd
        //% block="%rolemanager clear all roles"
        //% weight=94
        clearAllRoles(): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.onlyHeader(jacdac.RoleManagerCmd.ClearAllRoles))
        }
    
    }
    //% fixedInstance whenUsed block="role manager 1"
    export const roleManager1 = new RoleManagerClient("role Manager1");
}