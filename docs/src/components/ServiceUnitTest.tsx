/// <reference path="../../../jacdac-spec/spectool/jdtest.d.ts" />

import React, { useContext, useState } from 'react';
import Markdown from "./ui/Markdown"
import { Link } from 'gatsby-theme-material-ui';
import useGridBreakpoints from './useGridBreakpoints';

import useChange from '../jacdac/useChange';
import { Grid, Card, CardHeader, CardActions, Button, createStyles, makeStyles, Paper, Step, StepContent, StepLabel, Stepper, Theme, Typography } from '@material-ui/core';
// tslint:disable-next-line: no-submodule-imports
import Alert from "./ui/Alert";
import DeviceCardHeader from "./DeviceCardHeader"
import { JDService } from '../../../src/jdom/service';

enum TestStatus {
    Inactive,
    Active,
    Passed,
    Failed,
}

export function ServiceUnitTest(props: {serviceInstance: JDService, test: jdtest.UnitTest}) {
    const { serviceInstance, test } = props
    const [ testStatus, setTestStatus ] = useState<TestStatus>(TestStatus.Inactive)
    return (
        <Step key={test.description}>
        <StepLabel>{test.description}</StepLabel>
        <StepContent>
            {testStatus === TestStatus.Inactive && null}
        </StepContent>
        </Step>
    )
}
        /*
        test.commands.map(cmd => (
            <Step key={test.description}>
                <StepLabel>Test {id}: {label}</StepLabel>
                <StepContent>
                    <Markdown source={test.description} />
                    <div className={classes.actionsContainer}>
                        <div>
                            <Button
                                disabled={activeStep === 0}
                                onClick={handleBack}
                                className={classes.button}
                            >Back</Button>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={handleNext}
                                className={classes.button}
                            >{activeStep === stepLength - 1 ? 'Finish' : 'Next'}
                            </Button>
                        </div>
                    </div>
                </StepContent>
            </Step>
            {activeStep === stepLength && (
                <Paper square elevation={0} className={classes.resetContainer}>
                    <Typography>All steps completed - you&apos;re finished</Typography>
                    <Button onClick={handleReset} className={classes.button}>
                        Reset
                    </Button>
                </Paper>
*/