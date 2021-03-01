import React, { useContext, useMemo, useState } from "react"
import { Button, Grid } from "@material-ui/core"
import { parseSpecificationTestMarkdownToJSON } from "../../../../jacdac-spec/spectool/jdtest"
import { serviceSpecificationFromClassIdentifier } from "../../../../src/jdom/spec"
import useLocalStorage from "../useLocalStorage"
import HighlightTextField from "../ui/HighlightTextField"
import ServiceSpecificationSelect from "../ServiceSpecificationSelect"
import { SRV_BUTTON } from "../../../../src/jdom/constants"
import ServiceTest from "../ServiceTest"
import { fetchText } from "../github"
import AppContext from "../AppContext"

const SERVICE_TEST_STORAGE_KEY = "jacdac:servicetesteditorsource"

export default function ServiceTestEditor() {
    const { setError } = useContext(AppContext)
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
    const handleLoadFromGithub = async () => {
        try {
            const ghSource = await fetchText(
                "microsoft/jacdac",
                "main",
                `services/tests/${serviceSpec.shortId}.md`,
                "text/plain"
            )
            if (ghSource) 
                setSource(ghSource)
            else
                setError("Test source not found")
        } catch (e) {
            setError(e)
        }
    }
    return (
        <Grid spacing={2} container>
            <Grid item xs={12}>
                <Grid container spacing={2} direction="row">
                    <Grid item>
                        <ServiceSpecificationSelect
                            label={"Select a service to test"}
                            serviceClass={serviceClass}
                            setServiceClass={setServiceClass}
                        />
                    </Grid>
                    <Grid item>
                        <Button
                            variant="outlined"
                            disabled={!serviceSpec}
                            onClick={handleLoadFromGithub}
                        >
                            Load tests from GitHub
                        </Button>
                    </Grid>
                </Grid>
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
