import React, { useContext, useState } from 'react';
import { Link } from 'gatsby-theme-material-ui';
import useGridBreakpoints from './useGridBreakpoints';
import JacdacContext, { JacdacContextProps } from "../jacdac/Context";
import useChange from '../jacdac/useChange';
import { 
    Grid, 
    Card, 
    CardActions, 
    Button, 
    Paper, 
    Step, 
    StepContent, 
    StepLabel, 
    Stepper, 
    Typography } from '@material-ui/core';
// tslint:disable-next-line: no-submodule-imports
import Alert from "./ui/Alert";
import DeviceCardHeader from "./DeviceCardHeader"
import { JDService } from '../../../src/jdom/service';
import { serviceTestFromServiceSpec } from "../../../src/jdom/spec";
import ServiceUnitTest, { TestStatus } from "./ServiceUnitTest"
import DashbardDeviceItem from "./dashboard/DashboardDeviceItem"

export default function ServiceTest(props: { serviceSpec: jdspec.ServiceSpec }) {
    const { serviceSpec } = props
    const { classIdentifier: serviceClass } = serviceSpec
    const { bus } = useContext<JacdacContextProps>(JacdacContext)
    const [selectedService, setSelectedService] = useState<JDService>(undefined);
    const [activeStep, setActiveStep] = useState(0);
    const [activeTest, setActiveTest] = useState(-1);
    const serviceTest = serviceTestFromServiceSpec(serviceSpec);
    let testStatuses = serviceTest.tests.map(t => TestStatus.Inactive)
    const gridBreakpoints = useGridBreakpoints()
    // devices that implement serviceSpec
    const serviceInstances = useChange(bus, n =>
        n.devices({ serviceClass })
            .map(dev => dev.services({ serviceClass }))
            .reduce((l, r) => l.concat(r), [])
    )
    const handleSelect = (service: JDService) => () => {
        setSelectedService(service);
        handleNext();
    }
    const handleStartTest = (t: number) => () => {
        setActiveTest(() => t);
    };
    const handleNext = () => {
        setActiveStep((prevActiveStep) => prevActiveStep + 1);
    };
    const handleBack = () => {
        setActiveStep((prevActiveStep) => prevActiveStep - 1);
    };
    const handleReset = () => {
        setActiveStep(0);
    };
    const handleClose = (status: TestStatus) => {
        if(activeStep != -1)
            testStatuses[activeStep] = status;
        setActiveTest(t => -1)
        handleNext();
    }

    return (
        <Grid container spacing={2}>
            <Grid>
                <h2>Compliance tests for <Link to={`/services/${serviceSpec.shortId}/`}>{serviceSpec.name}</Link>  service</h2>
                <Stepper activeStep={activeStep} orientation="vertical">
                    <Step key="device">
                        <StepLabel>Select a device to test</StepLabel>
                        <StepContent>
                            {!!serviceInstances.length && <Grid container spacing={2}>
                                {serviceInstances.map(service => <Grid key={service.id} item {...gridBreakpoints}>
                                    <Card>
                                        <DeviceCardHeader device={service.device} />
                                        <CardActions>
                                            <Button variant="contained" color="primary" onClick={handleSelect(service)}>Select</Button>
                                        </CardActions>
                                    </Card>
                                </Grid>)}
                            </Grid>}
                            {!serviceInstances?.length && <Alert severity="info">Not seeing your device? Try some of the following.
                                <ul>
                                    <li>Check that your device is connected</li>
                                    <li>Use the <strong>packet console</strong> to monitor packets on the bus</li>
                                    <li>Check the class identifier in your annoucement packets</li>
                                </ul></Alert>}
                        </StepContent>
                    </Step>
                    {serviceTest.tests.map((test, index) => (
                        <Step key={index}>
                            <StepLabel>{test.description}</StepLabel>
                            <StepContent>
                                {index != activeTest && <Button onClick={handleStartTest(index)} >
                                    Start Test
                                </Button>}
                                {index === activeTest && <ServiceUnitTest
                                    serviceInstance={selectedService}
                                    test={test}
                                    onFinished={handleClose}
                                >
                                </ServiceUnitTest>}
                            </StepContent>
                        </Step>
                    ))}
                </Stepper>
                {activeStep === serviceTest.tests.length + 1 && (
                    <Paper square elevation={0} >
                        <Typography>All steps completed - you're finished</Typography>
                        <Button onClick={handleReset} >
                            Reset
                </Button>
                    </Paper>
                )}
            </Grid>
            {selectedService && <DashbardDeviceItem
                device={selectedService.device}
                showAvatar={true}
                showHeader={true}
                expanded={true}
            />}
        </Grid>
    );
}