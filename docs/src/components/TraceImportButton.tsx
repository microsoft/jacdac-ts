import React, { useState, useContext } from "react"
import ImportButton from "./ImportButton"
import { parseLogicLog, parseTrace } from "../../../src/jdom/logparser"
import PacketsContext from "./PacketsContext"
import Packet from "../../../src/jdom/packet";
import { arrayConcatMany } from "../../../src/jdom/utils";
import AppContext from "./AppContext"
import Trace from "../../../src/jdom/trace";

export default function TraceImportButton(props: { icon?: boolean, disabled?: boolean }) {
    const { icon, disabled } = props;
    const { recording, setReplayTrace } = useContext(PacketsContext)
    const { setError } = useContext(AppContext)
    const [importing, setImporting] = useState(false)

    const handleFiles = async (files: File[]) => {
        const file = files[0]
        if (file) {
            try {
                setImporting(true)
                const txt = await file.text()

                let trace: Trace;
                // let's try a few format and see if we're lucky
                try {
                    trace = parseTrace(txt)
                } catch (e) {
                    console.log(`trace parse error`, e)
                }

                // try logic format
                if (!trace) {
                    try {
                        const frames = parseLogicLog(txt) // ensure format is ok
                        const packets = arrayConcatMany(frames.map(frame => Packet.fromFrame(frame.data, frame.timestamp)))
                        if (packets?.length)
                            trace = new Trace(packets);
                    } catch (e) {
                        console.log(`logic parse error`, e)
                    }
                }

                // found anything?
                if (trace) {
                    console.log(`importing ${trace.packets.length} packets`)
                    setReplayTrace(trace);
                }
                else
                    setError("could not parse file")
            } finally {
                setImporting(false)
            }
        }
    }

    return <ImportButton icon={icon}
        disabled={importing || recording || disabled}
        text="Import Trace File"
        onFilesUploaded={handleFiles} />
}