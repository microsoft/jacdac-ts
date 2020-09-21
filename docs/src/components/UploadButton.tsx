import React, { useState } from 'react';
// tslint:disable-next-line: no-submodule-imports
import { makeStyles, createStyles, Theme } from '@material-ui/core/styles';
// tslint:disable-next-line: no-submodule-imports
import Button from '@material-ui/core/Button';

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        root: {
            '& > *': {
                margin: theme.spacing(1),
            },
        },
        input: {
            display: 'none',
        },
    }),
);

export default function UploadButton(props: {
    text: string,
    onFilesUploaded: (files: FileList) => void,
    required?: boolean,
    disabled?: boolean,
    multiple?: boolean,
    accept?: string
}) {
    const { text, onFilesUploaded, disabled, required, multiple, accept } = props;
    const [id] = useState('button-file' + Math.random().toString())
    const classes = useStyles();

    const handleChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
        if (ev.target.files.length)
            onFilesUploaded(ev.target.files)
    }

    return (
        <span className={classes.root}>
            <input
                className={classes.input}
                id={id}
                multiple={!!multiple}
                type="file"
                accept={accept}
                onChange={handleChange}
            />
            <label htmlFor={id}>
                <Button variant="contained" color={required ? "primary" : "inherit"} component="span" disabled={disabled}>
                    {text}
                </Button>
            </label>
        </span>
    );
}