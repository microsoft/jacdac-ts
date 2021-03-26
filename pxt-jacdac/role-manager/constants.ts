namespace jacdac {
    // Service: Role Manager
    export const SRV_ROLE_MANAGER = 0x1e4b7e66
    export const enum RoleManagerReg {
        /**
         * Read-write bool (uint8_t). Normally, if some roles are unfilled, and there are idle services that can fulfill them,
         * the brain device will assign roles (bind) automatically.
         * Such automatic assignment happens every second or so, and is trying to be smart about
         * co-locating roles that share "host" (part before first slash),
         * as well as reasonably stable assignments.
         * Once user start assigning roles manually using this service, auto-binding should be disabled to avoid confusion.
         *
         * ```
         * const [autoBind] = jdunpack<[number]>(buf, "u8")
         * ```
         */
        AutoBind = 0x80,

        /**
         * Read-only bool (uint8_t). Indicates if all required roles have been allocated to devices.
         *
         * ```
         * const [allRolesAllocated] = jdunpack<[number]>(buf, "u8")
         * ```
         */
        AllRolesAllocated = 0x181,
    }

    export const enum RoleManagerCmd {
        /**
         * Get the role corresponding to given device identifer. Returns empty string if unset.
         *
         * ```
         * const [deviceId, serviceIdx] = jdunpack<[Buffer, number]>(buf, "b[8] u8")
         * ```
         */
        GetRole = 0x80,

        /**
         * report GetRole
         * ```
         * const [deviceId, serviceIdx, role] = jdunpack<[Buffer, number, string]>(buf, "b[8] u8 s")
         * ```
         */

        /**
         * Set role. Can set to empty to remove role binding.
         *
         * ```
         * const [deviceId, serviceIdx, role] = jdunpack<[Buffer, number, string]>(buf, "b[8] u8 s")
         * ```
         */
        SetRole = 0x81,

        /**
         * No args. Remove all role bindings.
         */
        ClearAllRoles = 0x84,

        /**
         * Argument: stored_roles pipe (bytes). Return all roles stored internally.
         *
         * ```
         * const [storedRoles] = jdunpack<[Buffer]>(buf, "b[12]")
         * ```
         */
        ListStoredRoles = 0x82,

        /**
         * Argument: required_roles pipe (bytes). List all roles required by the current program. `device_id` and `service_idx` are `0` if role is unbound.
         *
         * ```
         * const [requiredRoles] = jdunpack<[Buffer]>(buf, "b[12]")
         * ```
         */
        ListRequiredRoles = 0x83,
    }


    /**
     * pipe_report StoredRoles
     * ```
     * const [deviceId, serviceIdx, role] = jdunpack<[Buffer, number, string]>(buf, "b[8] u8 s")
     * ```
     */

    /**
     * pipe_report RequiredRoles
     * ```
     * const [deviceId, serviceClass, serviceIdx, role] = jdunpack<[Buffer, number, number, string]>(buf, "b[8] u32 u8 s")
     * ```
     */


    export const enum RoleManagerEvent {
        /**
         * Emit notifying that the internal state of the service changed.
         */
        //% block="change"
        Change = 0x3,
    }

}
