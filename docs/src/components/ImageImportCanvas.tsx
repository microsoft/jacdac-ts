import React, { useState } from 'react';
import { Paper } from '@material-ui/core';
import ImportButton from './ImportButton';
import { Skeleton } from "@material-ui/lab";
import useBlobURL from "./useBlobURL"

export default function ImportImageCanvas(props: {
}) {
    const [imageBlob, setImageBlob] = useState<Blob>(undefined)
    const imageUrl = useBlobURL(imageBlob);

    const handleFilesUploaded = async (files: File[]) => {
        const file = files[0];
        setImageBlob(file);
    }

    return <Paper>
        {!imageUrl && <Skeleton variant="rect" width={480} height={360} />}
        {imageUrl && <img src={imageUrl} alt={"An picture of the device"} />}
        <ImportButton
            icon={true}
            text="Import 4:3 image"
            onFilesUploaded={handleFilesUploaded}
            acceptedFiles={["image/jpeg", "image/png"]} />
    </Paper>
}