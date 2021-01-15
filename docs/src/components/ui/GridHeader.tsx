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
    title: {
        verticalAlign: "text-bottom"
    }
}));

export default function GridHeader(props: {
    title: string,
    variant?: "subtitle1" | "caption" | "subtitle2"
    icon?: JSX.Element,
}) {
    const { title, variant, icon } = props;
    const classes = useStyles();
    return <Grid item xs={12}>
        <Grid container direction="row" spacing={2} justify="center" alignItems="center">
            <Grid item>
                <hr className={clsx(classes.hr, classes.start)} />
            </Grid>
            <Grid item>
                {icon && <Box component="span" ml={1} mr={1}>{icon}</Box>}
                <Typography className={classes.title} component="span" variant={variant || "subtitle1"}>{title}</Typography>
            </Grid>
            <Grid item xs>
                <hr className={classes.hr} />
            </Grid>
        </Grid>
    </Grid>
}
