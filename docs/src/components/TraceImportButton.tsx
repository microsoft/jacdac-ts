import React, { useState, useContext } from "react"
import UploadButton from "./UploadButton"
import { parseLog } from "../../../src/dom/logparser"
import PacketsContext from "./PacketsContext"
import Packet from "../../../src/dom/packet";
import { arrayConcatMany } from "../../../src/dom/utils";

export default function TraceImportButton(props: { icon?: boolean }) {
    const { icon } = props;
    const { setTrace } = useContext(PacketsContext)
    const [importing, setImporting] = useState(false)

    const handleFiles = async (files: FileList) => {
        const file = files.item(0)
        if (file) {
            try {
                setImporting(true)
                const txt = await file.text()
                const frames = parseLog(txt) // ensure format is ok
                console.log(`loaded ${frames?.length} frames`)
                const packets = arrayConcatMany(frames.map(frame => Packet.fromFrame(frame.data, frame.timestamp)))
                setTrace(packets);
            } finally {
                setImporting(false)
            }
        }
    }

    return <UploadButton icon={icon} disabled={importing} text="Import Trace File" onFilesUploaded={handleFiles} />
}