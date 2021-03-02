import React, { useContext, useState, useCallback } from "react"
import useServiceClient from "./useServiceClient"
import useGridBreakpoints from "./useGridBreakpoints"
import JacdacContext, { JacdacContextProps } from "../jacdac/Context"
import useChange from "../jacdac/useChange"
import {
    Grid,
    Card,
    CardActions,
    Button,
    Step,
    StepContent,
    StepLabel,
    Stepper,
} from "@material-ui/core"
// tslint:disable-next-line: no-submodule-imports
import { AlertTitle } from "@material-ui/lab"
// tslint:disable-next-line: match-default-export-name no-submodule-imports
import InfoIcon from "@material-ui/icons/Info"
import DeviceCardHeader from "./DeviceCardHeader"
import DashbardDeviceItem from "./dashboard/DashboardDeviceItem"
import ServiceUnitTest from "./ServiceUnitTest"
import Alert from "./ui/Alert"
import IconButtonWithTooltip from "./ui/IconButtonWithTooltip"
import {
    addHost,
    hostDefinitionFromServiceClass,
} from "../../../src/hosts/hosts"
import Flags from "../../../src/jdom/flags"
import { JDService } from "../../../src/jdom/service"
import { serviceTestFromServiceSpec } from "../../../src/jdom/spec"
import { ServiceTestRunner, TestStatus} from "../../../src/test/testrunner"

function SelectService(props: {
    serviceClass: number
    onSelect: (service: JDService) => void
}) {
    const { bus } = useContext<JacdacContextProps>(JacdacContext)
    const { serviceClass, onSelect } = props
    const services = useChange(bus, n => n.services({ serviceClass }), [])
    const gridBreakpoints = useGridBreakpoints()

    const handleSelect = (service: JDService) => () => onSelect(service)

    return (
        <>
            {!!services.length && (
                <Grid container spacing={2}>
                    {services.map(service => (
                        <Grid key={service.id} item {...gridBreakpoints}>
                            <Card>
                                <DeviceCardHeader device={service.device} />
                                <CardActions>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        onClick={handleSelect(service)}
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
                    Not seeing your device? Try some of the following.
                    <ul>
                        <li>Check that your device is connected</li>
                        <li>
                            Use the <strong>packet console</strong> to monitor
                            packets on the bus
                        </li>
                        <li>
                            Check the class identifier in your annoucement
                            packets
                        </li>
                    </ul>
                </Alert>
            )}
        </>
    )
}

function Diagnostics(props: { serviceClass: number }) {
    const { serviceClass } = props
    const { bus } = useContext<JacdacContextProps>(JacdacContext)

    const hostDefinition = hostDefinitionFromServiceClass(serviceClass)
    const handleStartSimulator = () => addHost(bus, hostDefinition.services())

    if (!hostDefinition)
        return null;

    return (
        <Alert severity="info">
            <AlertTitle>Developer zone</AlertTitle>
            <Button variant="outlined" onClick={handleStartSimulator}>
                start simulator
            </Button>
        </Alert>
    )
}


export default function ServiceTest(props: {
    serviceSpec: jdspec.ServiceSpec,
    serviceTest?: jdtest.ServiceTest,
    showStartSimulator?: boolean
}) {
    const { serviceSpec, showStartSimulator, serviceTest = serviceTestFromServiceSpec(serviceSpec) } = props
    const { classIdentifier: serviceClass } = serviceSpec
    const [selectedService, setSelectedService] = useState<JDService>(undefined)
    const [activeStep, setActiveStep] = useState(0)
    const factory = useCallback(service => new ServiceTestRunner(serviceTest, service),[])
    const testRunner: ServiceTestRunner = useServiceClient(selectedService, factory)

    const handleSelect = (service: JDService) => {
        setSelectedService(service)
        handleNext()
    }
    const handleStartTest = (t: number) => () => {
        testRunner.startTest(t);
    }
    const handleNext = () => {
        setActiveStep(prevActiveStep => prevActiveStep + 1)
    }
    const handleReset = () => { testRunner.reset() }
    const handleClose = (status: TestStatus) => {
        testRunner.finishTest(status);
        handleNext()
    }

    return (
        <>
            <h1>
                {`${serviceSpec.name} tests`}
                <IconButtonWithTooltip title="go to specifiction" to={`/services/${serviceSpec.shortId}/`}>
                    <InfoIcon />
                </IconButtonWithTooltip>
            </h1>
            {(Flags.diagnostics || showStartSimulator) && <Diagnostics serviceClass={serviceClass} />}
            <Grid container spacing={2}>
                <Grid item xs>
                    <Stepper activeStep={activeStep} orientation="vertical">
                        <Step key="device">
                            <StepLabel>Select a device to test</StepLabel>
                            <StepContent>
                                <SelectService
                                    serviceClass={serviceClass}
                                    onSelect={handleSelect}
                                />
                            </StepContent>
                        </Step>
                        {testRunner?.tests.map((test, index) => (
                            <Step key={index}>
                                <StepLabel error={test.status === TestStatus.Failed}>{test.description}</StepLabel>
                                <StepContent>
                                    {index !== testRunner.currentTest.index && (
                                        <Button
                                            variant="outlined"
                                            onClick={handleStartTest(index)}
                                        >
                                            Start Test
                                        </Button>
                                    )}
                                    {index === testRunner.currentTest.index && (
                                        <ServiceUnitTest
                                            test={test}
                                            onFinished={handleClose}
                                        ></ServiceUnitTest>
                                    )}
                                </StepContent>
                            </Step>
                        ))}
                    </Stepper>
                    {activeStep === serviceTest.tests.length + 1 && (
                        <Alert severity="success">
                            <AlertTitle>All steps completed.</AlertTitle>
                            <Button onClick={handleReset}>Reset</Button>
                        </Alert>
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
