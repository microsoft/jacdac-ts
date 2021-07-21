// Helper methods for unit testing VM programs

import { JDService } from "../../src/jdom/service";
import { assert } from "../../src/jdom/utils";
import RoleManager, { RoleBinding } from "../../src/servers/rolemanager";
import { VMProgram } from "../../src/vm/ir";

// Binds roles (using a provided role manager), checking that the roles provided 
// are exhaustive and correct for a given VMProgram
export function bindRoles(roleMgr: RoleManager, program: VMProgram, servers: Record<string, JDService>) {
    // Validate specified servers (name and type) against VMProgram
    assert(program.roles.length == Object.entries(servers).length, "different number of servers provided than required by program")

    const serverRolesMap = program.roles.map((vmRole => {
        assert(vmRole.role in servers, `servers missing role ${vmRole.role} required by program`)
        const service = servers[vmRole.role]
        assert(service.serviceClass == vmRole.serviceClass)
        return ({
            role: vmRole.role,
            serviceClass: vmRole.serviceClass,
            preferredDeviceId: service.device.deviceId,
            service: service
        } as RoleBinding)
    }))

    // Bind roles
    roleMgr.setRoles(serverRolesMap)
}
