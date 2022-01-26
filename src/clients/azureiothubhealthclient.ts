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
import { JDRegister } from "../jdom/register"
import { JDService } from "../jdom/service"
import { JDServiceClient } from "../jdom/serviceclient"
import { assert } from "../jdom/utils"

export class AzureIoTHubHealthClient extends JDServiceClient {
    private readonly hubNameRegister: JDRegister
    private readonly hubDeviceIdRegister: JDRegister
    private readonly connectionStatusRegister: JDRegister

    constructor(service: JDService) {
        super(service)
        assert(service.serviceClass === SRV_AZURE_IOT_HUB_HEALTH)

        // tell the bus to refresh these register
        this.hubNameRegister = this.service.register(
            AzureIotHubHealthReg.HubName
        )
        this.hubDeviceIdRegister = this.service.register(
            AzureIotHubHealthReg.HubDeviceId
        )
        this.connectionStatusRegister = this.service.register(
            AzureIotHubHealthReg.ConnectionStatus
        )
        this.mount(() =>
            this.hubNameRegister.subscribe(REPORT_UPDATE, () =>
                this.emit(CHANGE)
            )
        )
        this.mount(() =>
            this.connectionStatusRegister.subscribe(REPORT_UPDATE, () => {
                this.emit(CHANGE)
            })
        )
        this.mount(() =>
            this.service
                .event(AzureIotHubHealthEvent.ConnectionStatusChange)
                .on(EVENT, () => {
                    this.connectionStatusRegister.scheduleRefresh()
                })
        )
    }

    get hubName() {
        return this.hubNameRegister.stringValue
    }

    get hubDeviceId() {
        return this.hubDeviceIdRegister.stringValue
    }

    get connectionStatus(): AzureIotHubHealthConnectionStatus {
        const reg = this.connectionStatusRegister
        const status = reg
            .unpackedValue?.[0] as AzureIotHubHealthConnectionStatus
        if (status === undefined) reg.scheduleRefresh()
        return status
    }

    /**
     * Sends a connect command to the hub
     */
    async connect() {
        await this.service.sendCmdAsync(
            AzureIotHubHealthCmd.Connect,
            undefined,
            true
        )
    }

    /**
     * Sends a disconnect command to the hub
     */
    async disconnect() {
        await this.service.sendCmdAsync(
            AzureIotHubHealthCmd.Disconnect,
            undefined,
            true
        )
    }

    /**
     * Sends a new connection string to the iot debice
     * @param connectionString
     */
    async setConnectionString(connectionString: string) {
        const data = jdpack<[string]>("s", [connectionString || ""])
        await this.service.sendCmdAsync(
            AzureIotHubHealthCmd.SetConnectionString,
            data,
            true
        )
    }
}
