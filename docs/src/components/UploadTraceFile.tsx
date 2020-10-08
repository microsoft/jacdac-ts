import React, { useState, useContext } from "react"
import UploadButton from "./UploadButton"
import { parseLog } from "../../../src/dom/logparser"
import PacketsContext from "./PacketsContext"

export default function UploadTraceFile() {
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
                setTrace(frames)
            } finally {
                setImporting(false)
            }
        }
    }

    return <UploadButton disabled={importing} text="Import File" onFilesUploaded={handleFiles} />
}