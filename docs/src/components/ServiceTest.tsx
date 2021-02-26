import React, { useContext, useState } from 'react';
import Markdown from "./ui/Markdown"
import { Link } from 'gatsby-theme-material-ui';
import useGridBreakpoints from './useGridBreakpoints';
import JacdacContext, { JacdacContextProps } from "../jacdac/Context";
import useChange from '../jacdac/useChange';
import { Grid, Card, CardActions, Button, createStyles, makeStyles, Paper, Step, StepContent, StepLabel, Stepper, Theme, Typography } from '@material-ui/core';
// tslint:disable-next-line: no-submodule-imports
import Alert from "./ui/Alert";
import DeviceCardHeader from "./DeviceCardHeader"
import { JDService } from '../../../src/jdom/service';
import { SRV_BUTTON } from '../../../src/jdom/constants';

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

interface ServiceTest {
    id: string;
    label: string;
    description: string;
    test?: (service: JDService, onResult: (error: string) => void) => () => void;
}

function resolveTestsForService(serviceClass: number): ServiceTest[] {
    if (serviceClass === SRV_BUTTON) {
        return [
            {
                id: "setup",
                label: "Prepare the button",
                description: "Make sure the button is up and ready to be used.",
            },
            {
                id: "downUp",
                label: "Press down and up",
                description: "Press the button and release it immediately."
            },
            {
                id: "click",
                label: "Click the button",
                description: "Press the button down for 500ms and less than 1500ms and release it."
            },
            {
                id: "click",
                label: "Hold the button",
                description: "Press the button down at least 1500ms and release it."
            },
        ]
    }
    return [];
}

export default function ServiceTest(props: { serviceSpec: jdspec.ServiceSpec }) {
    const { serviceSpec } = props
    const { classIdentifier: serviceClass } = serviceSpec
    const { bus } = useContext<JacdacContextProps>(JacdacContext)
    const classes = useStyles();
    const [selectedService, setSelectedService] = useState<JDService>(undefined);
    const [activeStep, setActiveStep] = useState(0);
    const tests = resolveTestsForService(serviceClass);
    const stepLength = tests.length + 1;
    const gridBreakpoints = useGridBreakpoints()
    const services = useChange(bus, n =>
        n.devices({ serviceClass })
            .map(dev => dev.services({ serviceClass }))
            .reduce((l, r) => l.concat(r), [])
    )
    const handleSelect = (service: JDService) => () => {
        setSelectedService(service);
        setActiveStep(1);
    }
    const handleNext = () => {
        setActiveStep((prevActiveStep) => prevActiveStep + 1);
    };
    const handleBack = () => {
        setActiveStep((prevActiveStep) => prevActiveStep - 1);
    };
    const handleReset = () => {
        setActiveStep(0);
    };

    return (
        <div className={classes.root}>
            <h2>Compliance tests for <Link to={`/services/${serviceSpec.shortId}/`}>{serviceSpec.name}</Link>  service</h2>
            <Stepper activeStep={activeStep} orientation="vertical">
                <Step key="device">
                    <StepLabel>Select a service to test</StepLabel>
                    <StepContent>
                        {!!services.length && <Grid container spacing={2}>
                            {services.map(service => <Grid item key={service.id} {...gridBreakpoints}>
                                <Card >
                                    <DeviceCardHeader device={service.device} />
                                    <CardActions>
                                        <Button variant="contained" color="primary" onClick={handleSelect(service)}>Select</Button>
                                    </CardActions>
                                </Card>
                            </Grid>)}
                        </Grid>}
                        {!services.length && <Alert severity="info">Not seeing your device? Try some of the following.
                        <ul>
                                <li>Check that your device is connected</li>
                                <li>Use the <strong>packet console</strong> to monitor packets on the bus</li>
                                <li>Check the class identifier in your annoucement packets</li>
                            </ul></Alert>}
                    </StepContent>
                </Step>
                {tests.map(({ id, label, description }) => (
                    <Step key={id}>
                        <StepLabel>Test {id}: {label}</StepLabel>
                        <StepContent>
                            <Markdown source={description} />
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
                ))}
            </Stepper>
            {activeStep === stepLength && (
                <Paper square elevation={0} className={classes.resetContainer}>
                    <Typography>All steps completed - you&apos;re finished</Typography>
                    <Button onClick={handleReset} className={classes.button}>
                        Reset
          </Button>
                </Paper>
            )}
        </div>
    );
}
