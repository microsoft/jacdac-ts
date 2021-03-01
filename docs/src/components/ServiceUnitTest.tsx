import React, { useState } from 'react';
import useChange from '../jacdac/useChange';
import { Grid, Button, Paper, Step, StepContent, StepLabel, Stepper } from '@material-ui/core';
// tslint:disable-next-line: no-submodule-imports
import { JDService } from '../../../src/jdom/service';
import { JDClient } from '../../../src/jdom/client';
import { cmdToPrompt } from '../test/interpreter';

export enum TestStatus {
    Inactive,
    Active,
    Passed,
    Failed,
}

export default function ServiceUnitTest(props: { service: JDService, test: jdtest.UnitTest, onFinished: (status: TestStatus) => void }) {
    const { service, test, onFinished } = props
    const [activeCommand, setActiveCommand] = useState(0);
    const handleNext = () => {
        setActiveCommand((prev) => prev + 1);
    };
    const handleClose = (status: TestStatus) => () => {
        onFinished(status);
    };
    return (<Grid>
        <Stepper activeStep={activeCommand} orientation="vertical">
            {test.commands.map((cmd, index) =>
            (<Step key={index}>
                <StepLabel>{((s: string) => s == "" ? "No prompt" : s)(cmdToPrompt(cmd))}</StepLabel>
                <StepContent>
                    <Grid container spacing={1} direction="row">
                        <Grid item>
                            <Button variant="outlined" onClick={handleNext}>Next</Button>
                        </Grid>
                        <Grid item>
                            <Button variant="outlined" onClick={handleClose(TestStatus.Passed)}>Yes</Button>
                        </Grid>
                        <Grid item>
                            <Button variant="outlined" onClick={handleClose(TestStatus.Failed)}>No</Button>
                        </Grid>
                    </Grid>
                </StepContent>
            </Step>)
            )}
        </Stepper>
    </Grid>);
}
