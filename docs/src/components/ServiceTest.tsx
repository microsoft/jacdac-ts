import React, { useContext } from 'react';
import { makeStyles, Theme, createStyles } from '@material-ui/core/styles';
import Stepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import StepContent from '@material-ui/core/StepContent';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Markdown from "./Markdown"
import { Link } from 'gatsby-theme-material-ui';
import useGridBreakpoints from './useGridBreakpoints';
import JACDACContext from '../../../src/react/Context';
import useChange from '../jacdac/useChange';
import { Grid, Card, CardHeader, CardActions } from '@material-ui/core';
// tslint:disable-next-line: no-submodule-imports
import Alert from '@material-ui/lab/Alert';


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

export default function ServiceTest(props: { serviceSpec: jdspec.ServiceSpec }) {
    const { serviceSpec } = props
    const { classIdentifier: serviceClass } = serviceSpec
    const { bus } = useContext(JACDACContext)
    const classes = useStyles();
    const [activeStep, setActiveStep] = React.useState(0);
    const tests = [
        {
            label: "this is a test",
            description: "this is the description"
        }
    ]
    const stepLength = tests.length + 1;
    const gridBreakpoints = useGridBreakpoints()
    const services = useChange(bus, n =>
        n.devices({ serviceClass })
            .map(dev => dev.services({ serviceClass }))
            .reduce((l, r) => l.concat(r), [])
    )

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
                    <StepLabel>Select a service</StepLabel>
                    <StepContent>
                        {!!services.length && <Grid container spacing={2}>
                            {services.map(service => <Grid item {...gridBreakpoints}><Card key={`srv${service.serviceClass}`}>
                                <CardHeader><DeviceName device={service.device} /></CardHeader>
                                <CardActions>
                                    <Button variant="contained" color="primary">Select</Button>
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
                {tests.map(({ label, description }) => (
                    <Step key={label}>
                        <StepLabel>{label}</StepLabel>
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
