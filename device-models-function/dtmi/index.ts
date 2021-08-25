import { AzureFunction, Context } from "@azure/functions"
import { routeToDTDL } from "jacdac-ts"

const httpTrigger: AzureFunction = async function (
    context: Context
): Promise<void> {
    const { bindingData } = context
    const dtmi = decodeURIComponent(bindingData.dtmi as string)
    context.log(`dtmi: ${dtmi}`)
    const dtdl = routeToDTDL(dtmi)
    context.res = {
        status: dtdl ? 200 : 404,
        headers: {
            "content-type": "application/json",
        },
        body: dtdl ? JSON.stringify(dtdl, null, 2) : undefined,
    }
}

export default httpTrigger
