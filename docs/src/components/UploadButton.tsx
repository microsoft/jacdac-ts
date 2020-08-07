import React from 'react';
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

export default function UploadButton(props: { text: string, onFilesUploaded: (files: FileList) => void, disabled?: boolean }) {
    const { text, onFilesUploaded, disabled } = props;
    const classes = useStyles();

    const handleChange = (ev: React.ChangeEvent<HTMLInputElement> ) => {
        if (ev.target.files.length)
            onFilesUploaded(ev.target.files)
    }

    return (
        <div className={classes.root}>
            <input
                className={classes.input}
                id="contained-button-file"
                type="file"
                onChange={handleChange}
            />
            <label htmlFor="contained-button-file">
                <Button variant="contained" color="primary" component="span" disabled={disabled}>
                    {text}
                </Button>
            </label>
        </div>
    );
}