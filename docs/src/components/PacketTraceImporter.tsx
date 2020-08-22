import React from "react"
import UploadButton from "./UploadButton"
import { Paper } from "@material-ui/core"

export default function PacketTraceImporter() {

    const handleFilesUploaded = (files) => {

    }
    return <UploadButton text="Import trace" onFilesUploaded={handleFilesUploaded} />
}