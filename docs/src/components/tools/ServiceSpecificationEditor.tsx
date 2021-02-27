import React, { useContext, useMemo } from "react"
import {
    Paper,
    createStyles,
    makeStyles,
    Theme,
    Grid,
} from "@material-ui/core"
import { parseServiceSpecificationMarkdownToJSON } from "../../../../jacdac-spec/spectool/jdspec"
import {
    serviceMap,
} from "../../../../src/jdom/spec"
import RandomGenerator from "../RandomGenerator"
import AppContext, { DrawerType } from "../AppContext"
import useLocalStorage from "../useLocalStorage"
import Alert from "../ui/Alert"
import GithubPullRequestButton from "../GithubPullRequestButton"
import HighlightTextField from "../ui/HighlightTextField"

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        root: {
            flexGrow: 1,
            backgroundColor: theme.palette.background.paper,
            marginBottom: theme.spacing(1),
        },
        segment: {
            marginBottom: theme.spacing(2),
        },
        editor: {
            backgroundColor: theme.palette.background.default,
            padding: theme.spacing(1),
        },
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

function RichEditor(props: {
    language?: string
    value: string
    onChange: (newValue: string) => void
}) {
    const { language = "markdown", value, onChange } = props
    return (
        <HighlightTextField
            code={value}
            language={language}
            onChange={onChange}
        />
    )
}

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
    const annotations = json?.errors?.map(error => ({
        row: error.line,
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

    return (
        <Grid spacing={2} className={classes.root} container>
            <Grid key="editor" item xs={12} md={drawerOpen ? 12 : 7}>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <RichEditor
                            value={source}
                            onChange={setSource}
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
            <Grid key="output" item xs={12} md={drawerOpen ? 12 : 5}>
                {!!annotations?.length && (
                    <Alert severity="warning">
                        <ul>
                            {annotations.map((a, i) => (
                                <li key={i}>
                                    line {a.row}: {a.text}
                                </li>
                            ))}
                        </ul>
                    </Alert>
                )}
                <Paper square className={classes.segment}>
                    <RandomGenerator device={false} />
                </Paper>
            </Grid>
        </Grid>
    )
}
