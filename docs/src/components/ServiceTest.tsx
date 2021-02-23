import React, { useContext, useState } from 'react';
import Markdown from "./ui/Markdown"
import { Link } from 'gatsby-theme-material-ui';
import useGridBreakpoints from './useGridBreakpoints';
import JacdacContext, { JacdacContextProps } from "../jacdac/Context";
import useChange from '../jacdac/useChange';
import { Grid, Card, CardHeader, CardActions, Button, createStyles, makeStyles, Paper, Step, StepContent, StepLabel, Stepper, Theme, Typography } from '@material-ui/core';
// tslint:disable-next-line: no-submodule-imports
import Alert from "./ui/Alert";
import DeviceCardHeader from "./DeviceCardHeader"
import { JDService } from '../../../src/jdom/service';
import { serviceTestFromServiceSpec } from "../../../src/jdom/spec";
import { ServiceUnitTest } from "./ServiceUnitTest"

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

// TODO:
// - select one of the available devices that implements the serviceSpec
// - enable the tests for that device/serviceSpec
// - track the status of each test (not-started, passed, failed)
// - allow to select a test to run it (only one active test at a time)
// - an active test has an active command

export default function ServiceTest(props: { serviceSpec: jdspec.ServiceSpec }) {
    const { serviceSpec } = props
    const { classIdentifier: serviceClass } = serviceSpec
    const { bus } = useContext<JacdacContextProps>(JacdacContext)
    const classes = useStyles();
    const [selectedServiceInstance, setSelectedService] = useState<JDService>(undefined);
    const [activeStep, setActiveStep] = useState(0);
    const serviceTest = serviceTestFromServiceSpec(serviceSpec);
    const gridBreakpoints = useGridBreakpoints()
    // devices that implement serviceSpec
    const serviceInstances = useChange(bus, n =>
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
            <h2>Compliance tests for <Link to={`/services/0x${serviceSpec.shortId}`}>{serviceSpec.shortName || serviceSpec.name}</Link>  service</h2>
            <Stepper activeStep={activeStep} orientation="vertical">
                <Step key="device">
                    <StepLabel>Select a device to test</StepLabel>
                    <StepContent>
                        {!!serviceInstances.length && <Grid container spacing={2}>
                            {serviceInstances.map(service => <Grid item {...gridBreakpoints}>
                                <Card key={service.id}>
                                    <DeviceCardHeader device={service.device} />
                                    <CardActions>
                                        <Button variant="contained" color="primary" onClick={handleSelect(service)}>Select</Button>
                                    </CardActions>
                                </Card>
                            </Grid>)}
                        </Grid>}
                        {!serviceInstances.length && <Alert severity="info">Not seeing your device? Try some of the following.
                        <ul>
                                <li>Check that your device is connected</li>
                                <li>Use the <strong>packet console</strong> to monitor packets on the bus</li>
                                <li>Check the class identifier in your annoucement packets</li>
                            </ul></Alert>}
                    </StepContent>
                </Step>
                {serviceTest.tests.map(test => (
                    <ServiceUnitTest serviceInstance={selectedServiceInstance} test={test} />
                ))}
            </Stepper>
        </div>
    );
}
