import React, { useContext, useState } from "react"
import { Link } from "gatsby-theme-material-ui"
import useGridBreakpoints from "./useGridBreakpoints"
import JacdacContext, { JacdacContextProps } from "../jacdac/Context"
import useChange from "../jacdac/useChange"
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
    Typography,
} from "@material-ui/core"
// tslint:disable-next-line: no-submodule-imports
import Alert from "./ui/Alert"
import DeviceCardHeader from "./DeviceCardHeader"
import { JDService } from "../../../src/jdom/service"
import { serviceTestFromServiceSpec } from "../../../src/jdom/spec"
import ServiceUnitTest, { TestStatus } from "./ServiceUnitTest"
import DashbardDeviceItem from "./dashboard/DashboardDeviceItem"
import Flags from "../../../src/jdom/flags"
import { AlertTitle } from "@material-ui/lab"
import {
    addHost,
    hostDefinitionFromServiceClass,
} from "../../../src/hosts/hosts"
import KindIcon from "./KindIcon"
import IconButtonWithTooltip from "./ui/IconButtonWithTooltip"
// tslint:disable-next-line: match-default-export-name no-submodule-imports
import InfoIcon from '@material-ui/icons/Info';

export default function ServiceTest(props: {
    serviceSpec: jdspec.ServiceSpec
}) {
    const { serviceSpec } = props
    const { classIdentifier: serviceClass } = serviceSpec
    const { bus } = useContext<JacdacContextProps>(JacdacContext)
    const [selectedService, setSelectedService] = useState<JDService>(undefined)
    const [activeStep, setActiveStep] = useState(0)
    const [activeTest, setActiveTest] = useState(-1)
    const serviceTest = serviceTestFromServiceSpec(serviceSpec)
    const testStatuses = serviceTest.tests.map(() => TestStatus.Inactive)
    const gridBreakpoints = useGridBreakpoints()
    const hostDefinition = hostDefinitionFromServiceClass(serviceClass)
    // devices that implement serviceSpec
    const services = useChange(bus, n => n.services({ serviceClass }), [])
    const handleSelect = (service: JDService) => () => {
        setSelectedService(service)
        handleNext()
    }
    const handleStartTest = (t: number) => () => {
        setActiveTest(() => t)
    }
    const handleNext = () => {
        setActiveStep(prevActiveStep => prevActiveStep + 1)
    }
    const handleBack = () => {
        setActiveStep(prevActiveStep => prevActiveStep - 1)
    }
    const handleReset = () => {
        setActiveStep(0)
    }
    const handleClose = (status: TestStatus) => {
        if (activeStep != -1) testStatuses[activeStep] = status
        setActiveTest(t => -1)
        handleNext()
    }
    const handleStartSimulator = () => addHost(bus, hostDefinition.services())

    return (
        <>
            <h1>
                {`${serviceSpec.name} tests`}
                <IconButtonWithTooltip to={`/services/${serviceSpec.shortId}/`}>
                    <InfoIcon />
                </IconButtonWithTooltip>
            </h1>
            {Flags.diagnostics && hostDefinition && (
                <Alert severity="info">
                    <AlertTitle>Developer zone</AlertTitle>
                    <Button variant="outlined" onClick={handleStartSimulator}>
                        start simulator
                    </Button>
                </Alert>
            )}
            <Grid container spacing={2}>
                <Grid item xs>
                    <Stepper activeStep={activeStep} orientation="vertical">
                        <Step key="device">
                            <StepLabel>Select a device to test</StepLabel>
                            <StepContent>
                                {!!services.length && (
                                    <Grid container spacing={2}>
                                        {services.map(service => (
                                            <Grid
                                                key={service.id}
                                                item
                                                {...gridBreakpoints}
                                            >
                                                <Card>
                                                    <DeviceCardHeader
                                                        device={service.device}
                                                    />
                                                    <CardActions>
                                                        <Button
                                                            variant="contained"
                                                            color="primary"
                                                            onClick={handleSelect(
                                                                service
                                                            )}
                                                        >
                                                            Select
                                                        </Button>
                                                    </CardActions>
                                                </Card>
                                            </Grid>
                                        ))}
                                    </Grid>
                                )}
                                {!services?.length && (
                                    <Alert severity="info">
                                        Not seeing your device? Try some of the
                                        following.
                                        <ul>
                                            <li>
                                                Check that your device is
                                                connected
                                            </li>
                                            <li>
                                                Use the{" "}
                                                <strong>packet console</strong>{" "}
                                                to monitor packets on the bus
                                            </li>
                                            <li>
                                                Check the class identifier in
                                                your annoucement packets
                                            </li>
                                        </ul>
                                    </Alert>
                                )}
                            </StepContent>
                        </Step>
                        {serviceTest.tests.map((test, index) => (
                            <Step key={index}>
                                <StepLabel>{test.description}</StepLabel>
                                <StepContent>
                                    {index != activeTest && (
                                        <Button
                                            onClick={handleStartTest(index)}
                                        >
                                            Start Test
                                        </Button>
                                    )}
                                    {index === activeTest && (
                                        <ServiceUnitTest
                                            service={selectedService}
                                            test={test}
                                            onFinished={handleClose}
                                        ></ServiceUnitTest>
                                    )}
                                </StepContent>
                            </Step>
                        ))}
                    </Stepper>
                    {activeStep === serviceTest.tests.length + 1 && (
                        <Paper square elevation={0}>
                            <Typography>All steps completed.</Typography>
                            <Button onClick={handleReset}>Reset</Button>
                        </Paper>
                    )}
                </Grid>
                {selectedService && (
                    <DashbardDeviceItem
                        device={selectedService.device}
                        showAvatar={true}
                        showHeader={true}
                        expanded={true}
                    />
                )}
            </Grid>
        </>
    )
}
