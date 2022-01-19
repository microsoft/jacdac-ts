// Helper methods for unit testing VM programs

import { ROLE_BOUND } from "../../src/jdom/constants"
import { JDService } from "../../src/jdom/service"
import { assert } from "../../src/jdom/utils"
import { RoleManager, RoleBinding } from "../../src/jdom/rolemanager"
import { TestDriverInterface } from "../../src/tstester/base"
import { EventWithHoldAdapter } from "../../src/tstester/eventhold"
import { VMProgram } from "../../src/vm/ir"
import { EventHandler } from "../../src/jdom/eventsource"
import { snakify } from "../../jacdac-spec/spectool/jdspec"

class RoleBoundTrigger extends EventWithHoldAdapter<string> {
    constructor(
        protected readonly roleMgr: RoleManager,
        protected readonly role?: string
    ) {
        super()
    }

    protected register(handler: (data: string) => void) {
        return this.roleMgr.on(ROLE_BOUND, handler)
    }

    protected deregister(handle: unknown) {
        this.roleMgr.off(ROLE_BOUND, handle as EventHandler)
    }

    protected processTrigger(role: string) {
        if (this.role == role) {
            return true
        }
    }
}

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
        const role = snakify(vmRole.role)
        assert(
            role in servers,
            `servers missing role ${role} (${vmRole.role}) required by program (${Object.keys(servers)})`
        )
        const service = servers[role]
        assert(
            service.serviceClass == vmRole.serviceClass,
            `serviceClass of ${vmRole.role} different than program`
        )
        return {
            role,
            serviceClass: vmRole.serviceClass,
            preferredDeviceId: service.device.deviceId,
            service: service,
        } as RoleBinding
    })

    // Bind roles
    roleMgr.updateRoles(serverRolesMap)
}

// For a VM program, returns an object mapping server service names to services once the roles have been bound.
// This should be done before any test code runs, so servers have time to initialize and announce.
export async function getRoles(
    tester: TestDriverInterface,
    roleMgr: RoleManager,
    program: VMProgram
): Promise<Record<string, JDService>> {
    await tester.waitFor(
        program.serverRoles.map(
            role => new RoleBoundTrigger(roleMgr, role.role)
        )
    )

    const outputMap: Record<string, JDService> = {}
    program.serverRoles.forEach(role => {
        outputMap[role.role] = roleMgr.service(role.role)
    })

    return outputMap
}
