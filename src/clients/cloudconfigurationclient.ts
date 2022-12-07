import {
    CloudConfigurationCmd,
    CloudConfigurationConnectionStatus,
    CloudConfigurationEvent,
    CloudConfigurationReg,
    CHANGE,
    EVENT,
    REPORT_UPDATE,
    SRV_CLOUD_CONFIGURATION,
} from "../jdom/constants"
import { jdpack } from "../jdom/pack"
import { JDRegister } from "../jdom/register"
import { JDService } from "../jdom/service"
import { JDServiceClient } from "../jdom/serviceclient"
import { assert } from "../jdom/utils"

export class CloudConfigurationClient extends JDServiceClient {
    private readonly serverNameRegister: JDRegister
    private readonly cloudDeviceIdRegister: JDRegister
    private readonly cloudTypeRegister: JDRegister
    private readonly connectionStatusRegister: JDRegister

    constructor(service: JDService) {
        super(service)
        assert(service.serviceClass === SRV_CLOUD_CONFIGURATION)

        // tell the bus to refresh these register
        this.serverNameRegister = this.service.register(
            CloudConfigurationReg.ServerName
        )
        this.cloudDeviceIdRegister = this.service.register(
            CloudConfigurationReg.CloudDeviceId
        )
        this.cloudTypeRegister = this.service.register(
            CloudConfigurationReg.CloudType
        )
        this.connectionStatusRegister = this.service.register(
            CloudConfigurationReg.ConnectionStatus
        )
        this.mount(() =>
            this.serverNameRegister.subscribe(REPORT_UPDATE, () =>
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
                .event(CloudConfigurationEvent.ConnectionStatusChange)
                .on(EVENT, () => {
                    this.connectionStatusRegister.scheduleRefresh()
                })
        )
    }

    get serverName() {
        return this.serverNameRegister.stringValue
    }

    get cloudDeviceId() {
        return this.cloudDeviceIdRegister.stringValue
    }

    get cloudType() {
        return this.cloudTypeRegister.stringValue
    }

    get connectionStatus(): CloudConfigurationConnectionStatus {
        const reg = this.connectionStatusRegister
        const status = reg
            .unpackedValue?.[0] as CloudConfigurationConnectionStatus
        if (status === undefined) reg.scheduleRefresh()
        return status
    }

    /**
     * Sends a connect command to the hub
     */
    async connect() {
        await this.service.sendCmdAsync(
            CloudConfigurationCmd.Connect,
            undefined,
            true
        )
    }

    /**
     * Sends a disconnect command to the hub
     */
    async disconnect() {
        await this.service.sendCmdAsync(
            CloudConfigurationCmd.Disconnect,
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
            CloudConfigurationCmd.SetConnectionString,
            data,
            true
        )
    }
}
