import React, { useMemo } from "react"
import { Grid } from "@material-ui/core"
import { parseServiceSpecificationMarkdownToJSON } from "../../../../jacdac-spec/spectool/jdspec"
import { serviceMap } from "../../../../src/jdom/spec"
import RandomGenerator from "../RandomGenerator"
import useLocalStorage from "../useLocalStorage"
import HighlightTextField from "../ui/HighlightTextField"
import ServiceSpecification from "../ServiceSpecification"

const SERVICE_SPECIFICATION_STORAGE_KEY =
    "jacdac:servicespecificationeditorsource"

export default function ServiceSpecificationEditor() {
    const [source, setSource] = useLocalStorage(
        SERVICE_SPECIFICATION_STORAGE_KEY,
        ""
    )
    const json = useMemo(
        () => parseServiceSpecificationMarkdownToJSON(source, serviceMap()),
        [source]
    )
    const servicePath =
        json &&
        `services/${(
            json.camelName ||
            json.shortId ||
            `0x${json.classIdentifier.toString(16)}`
        ).toLowerCase()}`
    return (
        <Grid spacing={1} container>
            <Grid item xs={12}>
                <HighlightTextField
                    code={source}
                    language={"markdown"}
                    onChange={setSource}
                    annotations={json?.errors}
                    pullRequestTitle={json && `Service: ${json.name}`}
                    pullRequestPath={servicePath}
                    pullRequestBody={`This pull request adds a new service definition.`}
                />
            </Grid>
            <Grid item>
                <RandomGenerator device={false} />
                {json && <ServiceSpecification service={json} />}
            </Grid>
        </Grid>
    )
}
