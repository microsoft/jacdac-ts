import { AzureFunction, Context } from "@azure/functions"
import {
    DTDL_SERVICES_PATH,
    DTDL_DEVICES_PATH,
    serviceSpecifications,
    serviceSpecificationToDTDL,
} from "jacdac-ts"

const httpTrigger: AzureFunction = async function (
    context: Context
): Promise<void> {
    const { bindingData } = context
    const dtmi = bindingData.dtmi as string
    const [route, ...parts] = dtmi.split("/")
    switch (route) {
        // dtmi:jacdac:services:...
        case DTDL_SERVICES_PATH: {
            // resolve service
            const specification = serviceSpecifications().find(
                spec => serviceSpecificationToDTDL(spec) === dtmi
            )
            if (!specification) {
                context.res = {
                    status: 404,
                }
                return
            }
            // render spec
            const dtdl = serviceSpecificationToDTDL(specification)
            context.res = {
                body: JSON.stringify(dtdl),
            }
        }
        // dtmi:jacdac:devices:...
        case DTDL_DEVICES_PATH: {
        }
    }

    const responseMessage = JSON.stringify(dtmi)
    context.res = {
        // status: 200, /* Defaults to 200 */
        body: responseMessage,
    }
}

export default httpTrigger
