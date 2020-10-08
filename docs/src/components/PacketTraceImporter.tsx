import React, { useState, useContext } from "react"
import { Button } from "@material-ui/core"
import { replayLog } from "../../../src/dom/logparser"
import JACDACContext, { JDContextProps } from "../../../src/react/Context"
import PacketsContext from "./PacketsContext"

export default function PacketTraceImporter() {
    const { trace, setTrace } = useContext(PacketsContext)
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const [importing, setImporting] = useState(false)

    const disabled = importing || !trace;

    const handleClear = async () => {
        try {
            setImporting(true)
            setTrace(undefined)
        } finally {
            setImporting(false)
        }
    }
    const handleReplay = () => {
        replayLog(bus, trace?.frames)
    }

    return <>
        <Button disabled={disabled} variant="contained" onClick={handleReplay}>
            Replay ({trace?.frames?.length || 0} frames)
        </Button>
        &nbsp;
        <Button disabled={disabled} aria-label={"Clear packet trace"} variant="contained" onClick={handleClear}>
            clear
        </Button>
    </>
}