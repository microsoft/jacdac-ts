import React, { useState } from 'react';
import useChange from '../jacdac/useChange';
import { Grid, Button, Paper, Step, StepContent, StepLabel, Stepper } from '@material-ui/core';
// tslint:disable-next-line: no-submodule-imports
import { JDService } from '../../../src/jdom/service';
import { JDClient } from '../../../src/jdom/client';

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
                {(cmd.kind === "say" || cmd.kind === "ask") &&
                    <StepLabel>{cmd.expr.map(exprToString).join(" ").slice(1, -1)}</StepLabel>}
                {cmd.kind === "ask" &&
                    <StepContent>
                        <Button onClick={handleClose(TestStatus.Passed)}>Yes</Button>
                        <Button onClick={handleClose(TestStatus.Failed)}>No</Button>
                    </StepContent>}
                {cmd.kind === "say" &&
                    <StepContent>
                        <Button onClick={handleNext}>Next</Button>
                    </StepContent>}
            </Step>)
            )}
        </Stepper>
    </Grid>);

    function exprToString(token: jdtest.ServiceTestToken) {
        return (token.js ? token.js : "") + (token?.const ? token.const.toString() : "") + (token.id ? token.id : "");
    }
}




