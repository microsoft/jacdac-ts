import React, { useMemo, useState } from "react"
import { Grid } from "@material-ui/core"
import { parseSpecificationTestMarkdownToJSON } from "../../../../jacdac-spec/spectool/jdtest"
import { serviceSpecificationFromClassIdentifier } from "../../../../src/jdom/spec"
import useLocalStorage from "../useLocalStorage"
import HighlightTextField from "../ui/HighlightTextField"
import ServiceSpecificationSelect from "../ServiceSpecificationSelect"
import { SRV_BUTTON } from "../../../../src/jdom/constants"
import ServiceTest from "../ServiceTest"

const SERVICE_TEST_STORAGE_KEY = "jacdac:servicetesteditorsource"

export default function ServiceTestEditor() {
    const [serviceClass, setServiceClass] = useState(SRV_BUTTON)
    const [source, setSource] = useLocalStorage(SERVICE_TEST_STORAGE_KEY, "")
    const serviceSpec = useMemo(
        () => serviceSpecificationFromClassIdentifier(serviceClass),
        [serviceClass]
    )
    const json = useMemo(
        () => parseSpecificationTestMarkdownToJSON(source, serviceSpec),
        [source, serviceSpec]
    )
    const servicePath =
        json &&
        `services/tests/${(
            serviceSpec.camelName ||
            serviceSpec.shortId ||
            `0x${serviceSpec.classIdentifier.toString(16)}`
        ).toLowerCase()}`
    return (
        <Grid spacing={1} container>
            <Grid item>
                <ServiceSpecificationSelect
                    label={"Select a service to test"}
                    serviceClass={serviceClass}
                    setServiceClass={setServiceClass}
                    fullWidth={true}
                />
            </Grid>
            <Grid item xs={12}>
                <HighlightTextField
                    code={source}
                    language={"markdown"}
                    onChange={setSource}
                    annotations={json?.errors}
                    pullRequestTitle={
                        json && `Service test: ${serviceSpec.name}`
                    }
                    pullRequestPath={servicePath}
                    pullRequestBody={`This pull request adds a new service definition.`}
                />
            </Grid>
            {json && (
                <Grid item xs={12}>
                    <ServiceTest serviceSpec={serviceSpec} serviceTest={json} />
                </Grid>
            )}
        </Grid>
    )
}
