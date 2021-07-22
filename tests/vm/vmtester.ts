// Helper methods for unit testing VM programs

import { ROLE_BOUND } from "../../src/jdom/constants"
import { JDService } from "../../src/jdom/service"
import { assert } from "../../src/jdom/utils"
import RoleManager, { RoleBinding } from "../../src/servers/rolemanager"
import { VMProgram } from "../../src/vm/ir"
import { FastForwardScheduler } from "../jdom/scheduler"

// Binds roles (using a provided role manager), checking that the roles provided
// are exhaustive and correct for a given VMProgram
export function bindRoles(
    roleMgr: RoleManager,
    program: VMProgram,
    servers: Record<string, JDService>
) {
    // Validate specified servers (name and type) against VMProgram
    assert(
        program.roles.length == Object.entries(servers).length,
        "different number of servers provided than required by program"
    )

    const serverRolesMap = program.roles.map(vmRole => {
        assert(
            vmRole.role in servers,
            `servers missing role ${vmRole.role} required by program`
        )
        const service = servers[vmRole.role]
        assert(service.serviceClass == vmRole.serviceClass, `serviceClass of ${vmRole.role} different than program`)
        return {
            role: vmRole.role,
            serviceClass: vmRole.serviceClass,
            preferredDeviceId: service.device.deviceId,
            service: service,
        } as RoleBinding
    })

    // Bind roles
    roleMgr.setRoles(serverRolesMap)
}

// For a VM program, returns an object mapping server service names to services once the roles have been bound.
// This should be done before any test code runs, so servers have time to initialize and announce.
export async function getRoles(
    roleMgr: RoleManager,
    program: VMProgram
): Promise<Record<string, JDService>> {
    const outputMap: Record<string, JDService> = {}
    assert(Object.keys(outputMap).length == 0)  // we rely on length to be accurate later

    const serverRoles = program.serverRoles.map(role => role.role)
    const promise = new Promise(resolve => {
        const handler = (role: string) => {
            if (serverRoles.includes(role) && !(role in outputMap)) {
                outputMap[role] = roleMgr.getService(role)
                if (Object.keys(outputMap).length == serverRoles.length) {
                    roleMgr.off(ROLE_BOUND, handler)
                    resolve(undefined)
                }
            }
        }
        roleMgr.on(ROLE_BOUND, handler)
    })

    // TODO should probably start fundamentally rethinking this abstraction
    if (roleMgr.bus.scheduler instanceof FastForwardScheduler) {
        await roleMgr.bus.scheduler.runToPromise(promise)
    } else {
        await promise
    }

    return outputMap
}
