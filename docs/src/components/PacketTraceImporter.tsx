import React, { useState, useContext } from "react"
import UploadButton from "./UploadButton"
import { Paper, makeStyles, Theme, createStyles, Button, ButtonGroup, Typography } from "@material-ui/core"
import useDbValue from "./useDbValue"
import { parseLog, replayLog } from "../../../src/dom/logparser"
import JACDACContext from "../../../src/react/Context"

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        box: {
            marginBottom: theme.spacing(2)
        }
    })
);

export default function PacketTraceImporter() {
    const { value: trace, setValue: setTrace } = useDbValue("packettrace", undefined)
    const { bus } = useContext(JACDACContext)
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
        <Typography variant="body1">
            {!frames && "No packet trace loaded."}
            {frames && `Packet trace with ${frames.length} frames loaded.`}
        </Typography>
        <ButtonGroup>
            <Button disabled={!trace} onClick={handleReplay}>Replay</Button>
            <UploadButton text="Import trace" onFilesUploaded={handleFiles} />
            {!!trace && <Button aria-label={"Clear packet trace"} onClick={handleClear}>clear</Button>}
        </ButtonGroup>
    </>
}