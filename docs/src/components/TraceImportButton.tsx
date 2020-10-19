import React, { useState, useContext } from "react"
import ImportButton from "./ImportButton"
import { parseLogicLog, parseTraceLog } from "../../../src/dom/logparser"
import PacketsContext from "./PacketsContext"
import Packet from "../../../src/dom/packet";
import { arrayConcatMany } from "../../../src/dom/utils";
import AppContext from "./AppContext"

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

                let packets: Packet[];
                // let's try a few format and see if we're lucky
                try {
                    packets = parseTraceLog(txt)
                } catch (e) {
                    console.log(`trace parse error`, e)
                }

                // try logic format
                if (!packets) {
                    try {
                        const frames = parseLogicLog(txt) // ensure format is ok
                        packets = arrayConcatMany(frames.map(frame => Packet.fromFrame(frame.data, frame.timestamp)))
                    } catch (e) {
                        console.log(`logic parse error`, e)
                    }
                }

                // found anything?
                if (packets) {
                    console.log(`importing ${packets.length} packets`)
                    setReplayTrace(packets);
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