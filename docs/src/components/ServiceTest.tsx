import React, { useContext, useState, useCallback } from "react"
import useServiceClient from "./useServiceClient"
import JacdacContext, { JacdacContextProps } from "../jacdac/Context"
import {
    Grid,
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
import { JDServiceTestRunner, JDTestRunner, JDTestStatus} from "../../../src/test/testrunner"
import SelectService from "./SelectService"

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
    serviceTest?: jdtest.ServiceTestSpec,
    showStartSimulator?: boolean
}) {
    const { serviceSpec, showStartSimulator, serviceTest = serviceTestFromServiceSpec(serviceSpec) } = props
    const { classIdentifier: serviceClass } = serviceSpec
    const [selectedService, setSelectedService] = useState<JDService>(undefined)
    const [activeStep, setActiveStep] = useState(0)
    const factory = useCallback(service => new JDServiceTestRunner(serviceTest, service),[serviceTest])
    const testRunner = useServiceClient(selectedService, factory)
    const [testStatuses, setTestStatuses]  = useState<JDTestStatus[]>([])
    
    const handleSelect = (service: JDService) => {
        setSelectedService(service)
        handleNext()
    }
    const handleStartTest = (test: JDTestRunner) => () => { test.start() }
    const handleNext = () => { setActiveStep(prevActiveStep => prevActiveStep + 1) }
    const handleReset = () => { testRunner.reset() }
    const handleClose = (test: JDTestRunner) => (status: JDTestStatus) => {
        test.finish(status)
        setTestStatuses(testRunner.tests.map(t => t.status))
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
                                <StepLabel error={testStatuses[index] === JDTestStatus.Failed}>{test.description}</StepLabel>
                                <StepContent>
                                    {testStatuses[index] === JDTestStatus.Ready && (
                                        <Button
                                            variant="outlined"
                                            onClick={handleStartTest(test)}
                                        >
                                            Start Test
                                        </Button>
                                    )}
                                    {testStatuses[index]=== JDTestStatus.Active && (
                                        <ServiceUnitTest
                                            test={test}
                                            onFinished={handleClose(test)}
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
