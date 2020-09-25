import React, { useState, useContext } from "react"
import UploadButton from "./UploadButton"
import { Paper, makeStyles, Theme, createStyles, Button, ButtonGroup, Typography } from "@material-ui/core"
import useDbValue from "./useDbValue"
import { parseLog, replayLog } from "../../../src/dom/logparser"
import JACDACContext, { JDContextProps } from "../../../src/react/Context"

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        box: {
            marginBottom: theme.spacing(2)
        }
    })
);

export default function PacketTraceImporter() {
    const { value: trace, setValue: setTrace } = useDbValue("packettrace", undefined)
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const classes = useStyles()
    const [importing, setImporting] = useState(false)
    const frames = parseLog(trace)

    const handleFiles = async (files: FileList) => {
        const file = files.item(0)
        if (file) {
            try {
                setImporting(true)
                const txt = await file.text()
                parseLog(txt) // ensure format is ok
                setTrace(txt)
            } finally {
                setImporting(false)
            }
        }
    }
    const handleClear = async () => {
        try {
            setImporting(true)
            setTrace(undefined)
        } finally {
            setImporting(false)
        }
    }
    const handleReplay = () => {
        replayLog(bus, frames)
    }

    return <>
        <UploadButton text="Import trace" onFilesUploaded={handleFiles} />
        {!!trace && <Button variant="contained" onClick={handleReplay}>Replay ({frames.length} frames)</Button>}
        {!!trace && <Button aria-label={"Clear packet trace"} variant="contained" onClick={handleClear}>clear</Button>}
    </>
}