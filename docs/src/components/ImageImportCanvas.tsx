import React, { useMemo, useState } from 'react';
import { Box, createStyles, makeStyles, Paper, useTheme } from '@material-ui/core';
import ImportButton from './ImportButton';
import { Skeleton } from "@material-ui/lab";
import useBlobCanvas from "./useBlobCanvas"

const useStyles = makeStyles((theme) => createStyles({
    root: {
        position: "relative"
    },
    img: {
        margin: "auto",
        display: "block"
    },
    btn: {
        position: "absolute",
        borderRadius: "6rem",
        left: "calc(50% - 3rem)",
        top: "calc(50% - 3rem)"
    }
}))


export default function ImportImageCanvas(props: { width: number, height: number }) {
    const { width, height } = props;
    const [imageBlob, setImageBlob] = useState<Blob>(undefined)
    const canvas = useBlobCanvas(imageBlob, width, height);
    const canvasUrl = useMemo(() => canvas?.toDataURL("image/jpeg", 85), [canvas])
    const classes = useStyles();

    const handleFilesUploaded = async (files: File[]) => {
        const file = files[0];
        setImageBlob(file);
    }

    return <div className={classes.root}>
        {!canvasUrl && <Skeleton className={classes.img} variant="rect" width={width} height={height} />}
        {canvasUrl && <img className={classes.img} src={canvasUrl} width={width} height={height} />}
        <ImportButton
            className={classes.btn}
            icon={true}
            text="Import 4:3 image"
            onFilesUploaded={handleFilesUploaded}
            acceptedFiles={["image/jpeg", "image/png"]} />
    </div>
}