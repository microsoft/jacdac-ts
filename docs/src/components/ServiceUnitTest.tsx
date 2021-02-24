/// <reference path="../../../jacdac-spec/spectool/jdtest.d.ts" />

import React, { useState } from 'react';
import useChange from '../jacdac/useChange';
import { Grid, Button, Paper, Step, StepContent, StepLabel, Stepper, Theme, Typography } from '@material-ui/core';
// tslint:disable-next-line: no-submodule-imports
import { JDService } from '../../../src/jdom/service';
import { JDClient } from '../../../src/jdom/client';

export enum TestStatus {
    Inactive,
    Active,
    Passed,
    Failed,
}

// a TestStep will generally contain a prompt to the user and end with a check by the machine
interface TestStep {
    start: number;
    length: number;
}

function createTestSteps(test: jdtest.UnitTest) {
    let testSteps: TestStep[] = [];
    let currTestStep: TestStep = { start: 0, length: undefined }
    let currLength = 0;
    test.commands.forEach((cmd, index) => {
        if (cmd.kind === "say" && currLength > 0) {
            closeTestStep(index);
        } else {
            // 
        }
        currLength++;
    })
    function closeTestStep(index: number) {
        currTestStep.length = currLength;
        testSteps.push(currTestStep);
        currLength = 0;
        currTestStep = { start: index, length: undefined };
    }
}

// TODO: need a monitor that continually checks condition and reports back
class TestMonitor extends JDClient {

}

export default function ServiceUnitTest(props: { serviceInstance: JDService, test: jdtest.UnitTest, finished: (status: TestStatus) => void }) {
    const { serviceInstance, test, finished } = props
    const [activeCommand, setActiveCommand] = useState(0);
    const handleNext = () => {
        setActiveCommand((prevActiveStep) => prevActiveStep + 1);
    };
    const handleClose = () => {
        finished(TestStatus.Passed);
    };
    return (<Grid>
        <Stepper activeStep={activeCommand} orientation="vertical">
            {test.commands.map((cmd, index) => (commandToUI(index, cmd)))}
        </Stepper>
        {activeCommand === test.commands.length && (
            <Paper square elevation={0}>
                <Typography>All steps completed - you're finished</Typography>
                <Button onClick={handleClose}>
                    Close
            </Button>
            </Paper>
        )}
    </Grid>);
    // case "ask":
    //     case "check":
    //     case "observe":
    //     case "changes":
    //     break
    function commandToUI(index: number, cmd: jdtest.ServiceTestCommand) {
        return (<Step key={index}>
            {(cmd.kind === "say" || cmd.kind === "ask") && <StepLabel>{cmd.message}</StepLabel>}
            <StepContent>
                <Button
                    onClick={handleNext}
                >do command</Button>
            </StepContent>
        </Step>)
    }
}
