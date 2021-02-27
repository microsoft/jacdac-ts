import React, { useContext, useMemo } from "react"
import { Paper, createStyles, makeStyles, Theme, Grid } from "@material-ui/core"
import { parseServiceSpecificationMarkdownToJSON } from "../../../../jacdac-spec/spectool/jdspec"
import { serviceMap } from "../../../../src/jdom/spec"
import RandomGenerator from "../RandomGenerator"
import AppContext, { DrawerType } from "../AppContext"
import useLocalStorage from "../useLocalStorage"
import Alert from "../ui/Alert"
import GithubPullRequestButton from "../GithubPullRequestButton"
import HighlightTextField, { Annotation } from "../ui/HighlightTextField"
import ServiceSpecification from "../ServiceSpecification"

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        pre: {
            margin: "0",
            padding: "0",
            backgroundColor: "transparent",
            whiteSpec: "pre-wrap",
            flexGrow: 1,
        },
    })
)

const SERVICE_SPECIFICATION_STORAGE_KEY =
    "jacdac:servicespecificationeditorsource"

export default function ServiceSpecificationEditor() {
    const [source, setSource] = useLocalStorage(
        SERVICE_SPECIFICATION_STORAGE_KEY,
        ""
    )
    const classes = useStyles()
    const { drawerType } = useContext(AppContext)
    const json = useMemo(
        () => parseServiceSpecificationMarkdownToJSON(source, serviceMap()),
        [source]
    )
    const annotations: Annotation[] = json?.errors?.map(error => ({
        line: error.line,
        column: 1,
        text: error.message,
        type: "error",
    }))
    const drawerOpen = drawerType != DrawerType.None
    const servicePath =
        json &&
        `services/${(
            json.camelName ||
            json.shortId ||
            `0x${json.classIdentifier.toString(16)}`
        ).toLowerCase()}`
    const annotation = annotations?.[0]
    return (
        <Grid spacing={1} container>
            <Grid item xs={12} md={6}>
                <Grid container spacing={1}>
                    <Grid item xs={12}>
                        <HighlightTextField
                            code={source}
                            language={"markdown"}
                            onChange={setSource}
                            annotations={annotations}
                        />
                    </Grid>
                    <Grid item>
                        <Grid container spacing={1}>
                            <Grid item>
                                <GithubPullRequestButton
                                    label={"submit service"}
                                    title={json && `Service: ${json.name}`}
                                    head={json && servicePath}
                                    body={`This pull request adds a new service definition for Jacdac.`}
                                    commit={json && `added service files`}
                                    files={
                                        servicePath && {
                                            [servicePath + ".md"]: source,
                                        }
                                    }
                                />
                            </Grid>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
            <Grid item>
                {annotation && (
                    <Alert severity="warning">
                        line {annotation.line}: {annotation.text}
                    </Alert>
                )}
                <RandomGenerator device={false} />
                {json && <ServiceSpecification service={json} />}
            </Grid>
        </Grid>
    )
}
