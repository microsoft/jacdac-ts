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
    List,
    ListItemText,
    ListItem,
    ListItemIcon,
    Typography,
    Card,
    CardContent,
} from "@material-ui/core"
// tslint:disable-next-line: no-submodule-imports
import { AlertTitle } from "@material-ui/lab"
// tslint:disable-next-line: match-default-export-name no-submodule-imports
import InfoIcon from "@material-ui/icons/Info"
import Alert from "./ui/Alert"
import IconButtonWithTooltip from "./ui/IconButtonWithTooltip"
import {
    addHost,
    hostDefinitionFromServiceClass,
} from "../../../src/hosts/hosts"
import Flags from "../../../src/jdom/flags"
import { JDService } from "../../../src/jdom/service"
import { serviceTestFromServiceSpec } from "../../../src/jdom/spec"
import { cmdToPrompt, JDServiceTestRunner, JDTestRunner, JDTestStatus } from "../../../src/test/testrunner"
import SelectService from "./SelectService"
import ErrorIcon from '@material-ui/icons/Error';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import HourglassEmptyIcon from '@material-ui/icons/HourglassEmpty';
import PlayCircleFilledIcon from '@material-ui/icons/PlayCircleFilled';
import useChange from "../jacdac/useChange"
import DashboardDevice from "./dashboard/DashboardDevice"

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

function TestStatusIcon(props: { test: JDTestRunner }) {
    const { test } = props;
    const status = useChange(test, t => t.status);

    switch (status) {
        case JDTestStatus.Active: return <PlayCircleFilledIcon color="action" />
        case JDTestStatus.Failed: return <ErrorIcon color="error" />
        case JDTestStatus.Passed: return <CheckCircleIcon color="primary" />
        default: return <HourglassEmptyIcon color="disabled" />
    }
}

function TestListItem(props: { test: JDTestRunner }) {
    const { test } = props;
    const { specification } = test;
    const { description } = specification;

    return <ListItem>
        <ListItemIcon>
            <TestStatusIcon test={test} />
        </ListItemIcon>
        <ListItemText primary={description} />
    </ListItem>
}

function TestList(props: { testRunner: JDServiceTestRunner }) {
    const { testRunner } = props;
    const { tests } = testRunner;

    return <Card>
        <CardContent>
            <List dense={true}>
                {tests.map((test, i) => <TestListItem key={i} test={test} />)}
            </List>
        </CardContent>
    </Card>
}

function TestStepper(props: { test: JDTestRunner }) {
    const { test } = props
    const { specification } = test;
    const { commands } = specification;
    const [activeCommand, setActiveCommand] = useState(0);
    const handleNext = () => {
        setActiveCommand((prev) => prev + 1);
    };
    const handleClose = (status: JDTestStatus) => () => {
        test.finish(status)
    };
    return <Stepper activeStep={activeCommand} orientation="vertical">
        {commands.map((cmd, index) => <Step key={index}>
            <StepLabel>{cmdToPrompt(cmd) || "no prompt"}</StepLabel>
            <StepContent>
                <Grid container spacing={1} direction="row">
                    <Grid item>
                        <Button variant="outlined" onClick={handleNext}>Next</Button>
                    </Grid>
                    <Grid item>
                        <Button variant="outlined" onClick={handleClose(JDTestStatus.Passed)}>Yes</Button>
                    </Grid>
                    <Grid item>
                        <Button variant="outlined" onClick={handleClose(JDTestStatus.Failed)}>No</Button>
                    </Grid>
                </Grid>
            </StepContent>
        </Step>)
        }
    </Stepper>;
}

function ActiveTest(props: { test: JDTestRunner }) {
    const { test } = props;
    const { specification } = test;
    const { description } = specification;

    return <Card>
        <CardContent>
            <Typography variant="h5" component="h2">{description}</Typography>
            <TestStepper
                test={test}
            />
        </CardContent>
    </Card>
}

function ServiceTestRunnerSelect(props: { serviceClass: number, onSelect: (service: JDService) => void }) {
    const { serviceClass, onSelect } = props;
    return <>
        <h3>Select a device to test</h3>
        <SelectService
            serviceClass={serviceClass}
            onSelect={onSelect}
        />
    </>
}

/**
 *
 * @param props
 *                 <Grid container spacing={2} direction="row">
            <Grid item xs>
                <Stepper activeStep={activeStep} orientation="vertical">
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
                                {testStatuses[index] === JDTestStatus.Active && (
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
            {testRunner && <Grid item md={3}>
                <ServiceTestList testRunner={testRunner} />
            </Grid>}
        </Grid>
 */

export default function ServiceTest(props: {
    serviceSpec: jdspec.ServiceSpec,
    serviceTest?: jdtest.ServiceTestSpec,
    showStartSimulator?: boolean
}) {
    const { serviceSpec, showStartSimulator, serviceTest = serviceTestFromServiceSpec(serviceSpec) } = props
    const { classIdentifier: serviceClass } = serviceSpec
    const [selectedService, setSelectedService] = useState<JDService>(undefined)
    const factory = useCallback(service => new JDServiceTestRunner(serviceTest, service), [serviceTest])
    const testRunner = useServiceClient(selectedService, factory)
    const currentTest = useChange(testRunner, t => t?.currentTest)

    const handleSelect = (service: JDService) => {
        setSelectedService(service)
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
            <Grid container spacing={2} direction="row">
                {!testRunner && <Grid item xs={12}>
                    <ServiceTestRunnerSelect serviceClass={serviceClass} onSelect={handleSelect} />
                </Grid>}
                {testRunner && <Grid item xs={12} sm={3}>
                    <TestList testRunner={testRunner} />
                </Grid>}
                {currentTest && <Grid item xs={12} sm={5}>
                    <ActiveTest test={currentTest} />
                </Grid>}
                {selectedService && <Grid item xs={12} sm={4}>
                    <DashboardDevice
                        device={selectedService.device} />
                </Grid>}
            </Grid>
        </>
    )
}
