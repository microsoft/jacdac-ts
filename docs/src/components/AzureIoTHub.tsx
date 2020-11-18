import { Link } from "gatsby-theme-material-ui";
import React from "react";
import ApiKeyAccordion from "./ApiKeyAccordion";
import ConnectAlert from "./ConnectAlert";

const AZURE_IOT_HUB_API_KEY = "azureiothubapikey"
const AZURE_IOT_API_VERSION = "2020-05-31-preview"


function ApiKeyManager() {
    const validateKey = async (key: string) => {
        return {
            statusCode: 200
        }
    };
    return <ApiKeyAccordion
        apiName={AZURE_IOT_HUB_API_KEY}
        validateKey={validateKey}
        instructions={<p>To get an <b>API key</b>, navigate to &nbsp;
            <Link to="https://studio.edgeimpulse.com/studio/8698/keys" target="_blank">https://studio.edgeimpulse.com/studio/8698/keys</Link>
            &nbsp; and generate a new key.</p>}
    />
}

// https://docs.microsoft.com/en-us/rest/api/iothub/service/devices/createorupdateidentity#device
interface AzureIotDevice {
    deviceId: string;
    etag: string;
    generationId: string;
    lastActivityTime?: string;
    status: "enabled" | "disabled",
    statusReason: string,
    statusUpdateTime: string,
}

interface AzureIotResponse<T> {
    status: number;
    success: boolean;
    payload?: T;
    error?: { code: string; message: string };
}

class AzureIotHubClient {
    // https://docs.microsoft.com/en-us/rest/api/iothub/
    // https://docs.microsoft.com/en-us/rest/api/iothub/common-error-codes
    static async apiFetch<T>(authorization: string, fullyQualifiedHubName: string, path: string | number, method?: "GET" | "POST" | "PUT" | "DELETE", body?: any): Promise<AzureIotResponse<T>> {
        const url = `https://${fullyQualifiedHubName}.azure-devices.net/${path}?api-version=${AZURE_IOT_API_VERSION}`
        const options: RequestInit = {
            method: method || "GET",
            headers: {
                "Authorization": authorization,
                "Accept": "application/json"
            },
            body: body && JSON.stringify(body)
        }
        if (options.method === "POST" || options.method === "PUT")
            options.headers["Content-Type"] = "application/json"

        const resp = await fetch(url, options)
        const success = resp.status >= 200 && resp.status <= 204
        try {
            const payload = await resp.json();
            return {
                status: resp.status,
                success,
                payload: success && payload as T,
                error: !success && payload
            }
        } catch (e) {
            return {
                status: resp.status,
                success: false,
                error: { code: "ClientError", message: e.message }
            };
        }
    }

    // https://docs.microsoft.com/en-us/rest/api/iothub/service/devices/getidentity
    static getIdentity(apiKey: string, fullyQualifiedHubName: string, deviceId: string) {
        return this.apiFetch<AzureIotDevice>(apiKey, fullyQualifiedHubName, `devices/${deviceId}`);
    }
    //https://docs.microsoft.com/en-us/rest/api/iothub/service/devices/createorupdateidentity#device
    static createOrUpdateIdentity(apiKey: string, fullyQualifiedHubName: string, deviceId: string, payload: AzureIotDevice) {
        return this.apiFetch<AzureIotDevice>(apiKey, fullyQualifiedHubName, `devices/${deviceId}`, "PUT", payload);
    }
}

export default function AzureIoTHub(props: {}) {
    return <>
        <ConnectAlert />
        <ApiKeyManager />
    </>
}