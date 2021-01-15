import { Box, createStyles, Grid, makeStyles, Typography, useTheme } from "@material-ui/core";
import React from "react";
import clsx from 'clsx';

const useStyles = makeStyles((theme) => createStyles({
    hr: {
        background: theme.palette.text.disabled,
        marginBottom: "unset"
    },
    start: {
        width: theme.spacing(2)
    },
}));

export default function GridHeader(props: {
    title: string,
    variant?: "subtitle1" | "caption" | "subtitle2"
    action?: JSX.Element
}) {
    const { title, variant, action } = props;
    const classes = useStyles();
    return <Grid item xs={12}>
        <Grid container direction="row" spacing={1} justify="center" alignItems="center">
            <Grid item>
                <hr className={clsx(classes.hr, classes.start)} />
            </Grid>
            <Grid item>
                {action && <Box component="span" mr={1}>{action}</Box>}
                <Typography component="span" variant={variant || "subtitle1"}>{title}</Typography>
            </Grid>
            <Grid item xs>
                <hr className={classes.hr} />
            </Grid>
        </Grid>
    </Grid>
}
