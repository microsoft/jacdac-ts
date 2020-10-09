import React, { useState } from 'react';
import { DropzoneDialog } from 'material-ui-dropzone'
import { Button, IconButton, Tooltip } from '@material-ui/core';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import OpenInBrowserIcon from '@material-ui/icons/OpenInBrowser';

export default function UploadButton(props: {
    icon?: boolean,
    text: string,
    onFilesUploaded: (files: File[]) => void,
    required?: boolean,
    disabled?: boolean,
    acceptedFiles?: string[]
}) {
    const [open, setOpen] = useState(false)
    const { text, onFilesUploaded, disabled, required, acceptedFiles, icon } = props;

    const handleOpen = () => {
        setOpen(true)
    }
    const handleSave = (files: File[]) => {
        if (files?.length)
            onFilesUploaded(files)
        setOpen(false)
    }
    const handleClose = () => setOpen(false)

    return <>
        {icon && <Tooltip title={text}>
            <span>
                <IconButton onClick={handleOpen}>
                    <OpenInBrowserIcon />
                </IconButton>
            </span>
        </Tooltip>
        }
        {!icon && <Button disabled={disabled} variant="outlined" onClick={handleOpen} startIcon={<OpenInBrowserIcon />}>
            {text}
        </Button>}
        <DropzoneDialog
            open={open}
            onSave={handleSave}
            maxFileSize={5000000}
            onClose={handleClose}
            acceptedFiles={acceptedFiles}
            clearOnUnmount={true}
            filesLimit={1}
            submitButtonText={"import"}
        />
    </>
}