import { PCMonitorReg, SRV_PCMONITOR } from "../jdom/constants"
import { JDRegisterServer } from "../jdom/servers/registerserver"
import { JDServerOptions, JDServiceServer } from "../jdom/servers/serviceserver"

export class PCMonitorServer extends JDServiceServer {
    readonly CPUUsage: JDRegisterServer<[number]>
    readonly CPUTemperature: JDRegisterServer<[number]>
    readonly RAMUsage: JDRegisterServer<[number]>
    readonly GPUInfo: JDRegisterServer<[number, number]>
    readonly NetworkInfo: JDRegisterServer<[number, number]>

    constructor(options?: JDServerOptions) {
        super(SRV_PCMONITOR, options)

        this.CPUUsage = this.addRegister<[number]>(PCMonitorReg.CpuUsage, [0])
        this.CPUTemperature = this.addRegister<[number]>(
            PCMonitorReg.CpuTemperature,
            [21],
        )
        this.RAMUsage = this.addRegister<[number]>(PCMonitorReg.RamUsage, [0])
        this.GPUInfo = this.addRegister<[number, number]>(
            PCMonitorReg.GpuInformation,
            [0, 0],
        )
        this.NetworkInfo = this.addRegister<[number, number]>(
            PCMonitorReg.NetworkInformation,
            [0, 0],
        )
    }
}
