/// <reference path="../../../jacdac-spec/spectool/jdtest.d.ts" />

import React, { useContext, useState } from 'react';
import Markdown from "./ui/Markdown"
import useChange from '../jacdac/useChange';
import { Grid, Card, CardHeader, CardActions, Button, createStyles, makeStyles, Paper, Step, StepContent, StepLabel, Stepper, Theme, Typography } from '@material-ui/core';
// tslint:disable-next-line: no-submodule-imports
import { JDService } from '../../../src/jdom/service';

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        root: {
            width: '100%',
        },
        button: {
            marginTop: theme.spacing(1),
            marginRight: theme.spacing(1),
        },
        actionsContainer: {
            marginBottom: theme.spacing(2),
        },
        resetContainer: {
            padding: theme.spacing(3),
        },
    }),
);

enum TestStatus {
    Inactive,
    Active,
    Passed,
    Failed,
}

// TODO: command interpreter

export default function ServiceUnitTest(props: {serviceInstance: JDService, test: jdtest.UnitTest}) {
    const classes = useStyles();
    const { serviceInstance, test } = props
    const [activeCommand, setActiveCommand] = useState(0);
    const handleNext = () => {
        setActiveCommand((prevActiveStep) => prevActiveStep + 1);
    };
    const handleClose = () => {
            
    };
    return (<div className={classes.root}>
        <h2>test steps</h2>
        <Stepper activeStep={activeCommand} orientation="vertical">
        {test.commands.map((cmd, index) => (
            <Step key={index}>
                <StepLabel>Command {cmd.kind}</StepLabel>
                <StepContent>
                    <Button
                        onClick={handleNext}
                        className={classes.button}
                    >do command</Button>
                </StepContent>
            </Step>
        ))}
        </Stepper>
        {activeCommand === test.commands.length && (
            <Paper square elevation={0} className={classes.resetContainer}>
            <Typography>All steps completed - you're finished</Typography>
            <Button onClick={handleClose} className={classes.button}>
                Close
            </Button>
            </Paper>
        )}
        </div>);
}
