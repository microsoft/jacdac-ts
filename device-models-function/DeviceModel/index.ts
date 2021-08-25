import { AzureFunction, Context } from "@azure/functions"
import { routeToDTDL } from "jacdac-ts"

const httpTrigger: AzureFunction = async function (
    context: Context
): Promise<void> {
    const { bindingData } = context
    const dtmi = bindingData.dtmi as string
    const dtdl = routeToDTDL(dtmi)
    context.res = {
        status: dtdl ? 200 : 404,
        body: dtdl ? JSON.stringify(dtdl) : undefined,
    }
}

export default httpTrigger
