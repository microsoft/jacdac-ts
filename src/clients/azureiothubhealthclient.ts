import {
    AzureIotHubHealthCmd,
    AzureIotHubHealthConnectionStatus,
    AzureIotHubHealthEvent,
    AzureIotHubHealthReg,
    CHANGE,
    EVENT,
    REPORT_UPDATE,
    SRV_AZURE_IOT_HUB_HEALTH,
} from "../jdom/constants"
import { jdpack } from "../jdom/pack"
import JDRegister from "../jdom/register"
import JDService from "../jdom/service"
import { JDServiceClient } from "../jdom/serviceclient"
import { parseDeviceId } from "../jdom/spec"
import { assert } from "../jdom/utils"

export class AzureIoTHubHealthClient extends JDServiceClient {
    readonly connectionStatusRegister: JDRegister
    readonly statisticsRegister: JDRegister

    constructor(service: JDService) {
        super(service)
        assert(service.serviceClass === SRV_AZURE_IOT_HUB_HEALTH)

        // tell the bus to refresh these register
        this.connectionStatusRegister = this.service.register(
            AzureIotHubHealthReg.ConnectionStatus
        )
        this.statisticsRegister = this.service.register(
            AzureIotHubHealthReg.Statistics
        )
        this.mount(() =>
            this.connectionStatusRegister.subscribe(REPORT_UPDATE, () =>
                this.emit(CHANGE)
            )
        )
        this.mount(() =>
            this.statisticsRegister.subscribe(REPORT_UPDATE, () =>
                this.emit(CHANGE)
            )
        )
        this.mount(() =>
            this.service
                .event(AzureIotHubHealthEvent.ConnectionStatusChange)
                .on(EVENT, () => {
                    this.connectionStatusRegister.refresh()
                    this.emit(CHANGE)
                })
        )
    }

    get hubName() {
        const reg = this.service.register(AzureIotHubHealthReg.HubName)
        reg.refresh(true)
        return reg.stringValue
    }

    get connectionStatus(): AzureIotHubHealthConnectionStatus {
        const reg = this.connectionStatusRegister
        return reg.unpackedValue[0] as AzureIotHubHealthConnectionStatus
    }

    get statistics() {
        const [reading, event, twinReported, twinDesired] =
            this.statisticsRegister.unpackedValue
        return {
            reading,
            event,
            twinReported,
            twinDesired,
        }
    }

    async connect() {
        await this.service.sendCmdAsync(
            AzureIotHubHealthCmd.Connect,
            undefined,
            true
        )
    }

    async disconnect() {
        await this.service.sendCmdAsync(
            AzureIotHubHealthCmd.Disconnect,
            undefined,
            true
        )
    }

    async identify(deviceId: string) {
        await this.service.sendCmdAsync(
            AzureIotHubHealthCmd.Identify,
            parseDeviceId(deviceId),
            true
        )
    }

    async reset(deviceId: string) {
        await this.service.sendCmdAsync(
            AzureIotHubHealthCmd.Reset,
            parseDeviceId(deviceId),
            true
        )
    }

    async ping(value: number) {
        const data = jdpack<[number]>("u32", [value])
        await this.service.sendCmdAsync(AzureIotHubHealthCmd.Ping, data, true)
    }
}
export default AzureIoTHubHealthClient
