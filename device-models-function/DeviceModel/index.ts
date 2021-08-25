import { AzureFunction, Context } from "@azure/functions"

const httpTrigger: AzureFunction = async function (
    context: Context
): Promise<void> {
    const { bindingData } = context
    const dtmi = bindingData.dtmi as string
    const responseMessage = JSON.stringify(dtmi)
    context.res = {
        // status: 200, /* Defaults to 200 */
        body: responseMessage,
    }
}

export default httpTrigger
