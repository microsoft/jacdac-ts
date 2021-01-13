import React, { useContext, useState } from "react";
import { Box, Grid } from "@material-ui/core";
import { Button } from "gatsby-theme-material-ui";
import KindIcon from "../KindIcon";
import SelectWithLabel from "../ui/SelectWithLabel";
import ButtonServiceHost from "../../../../src/hosts/buttonservicehost";
import BuzzerServiceHost from "../../../../src/hosts/buzzerservicehost"
import HumidityServiceHost from "../../../../src/hosts/humidityservicehost"
import RotaryEncoderServiceHost from "../../../../src/hosts/rotaryencoderservicehost"
import MotorEncoderServiceHost from "../../../../src/hosts/motorservicehost"

import JDDeviceHost from "../../../../src/jdom/devicehost";
import { MenuItem } from '@material-ui/core';
import JACDACContext, { JDContextProps } from "../../../../src/react/Context";
import { PotentiometerVariant, SRV_POTENTIOMETER, SRV_SERVO, SRV_THERMOMETER, SRV_VIBRATION_MOTOR, ThermometerVariant, VIRTUAL_DEVICE_NODE_NAME } from "../../../../src/jdom/constants";
import Alert from "../ui/Alert";
import JDSensorServiceHost from "../../../../src/hosts/sensorservicehost";
import { useSnackbar } from "notistack";
import JDServiceHost from "../../../../src/jdom/servicehost";

const thermometerOptions = {
    readingValue: 20,
    streamingInterval: 1000,
    minReading: -40,
    maxReading: 120,
    variant: ThermometerVariant.Outdoor
}

const hostDefinitions = [
    {
        name: "button",
        services: () => [new ButtonServiceHost()]
    },
    {
        name: "buzzer",
        services: () => [new BuzzerServiceHost()]
    },
    {
        name: "humidity + temperature",
        services: () => [new HumidityServiceHost(), new JDSensorServiceHost(SRV_THERMOMETER, thermometerOptions)]
    },
    {
        name: "motor",
        services: () => [new MotorEncoderServiceHost()]
    },
    {
        name: "rotary encoder",
        services: () => [new RotaryEncoderServiceHost()]
    },
    {
        name: "rotary encoder + button",
        services: () => [new RotaryEncoderServiceHost(), new ButtonServiceHost()]
    },
    {
        name: "rotary potentiometer",
        services: () => [new JDSensorServiceHost(SRV_POTENTIOMETER, { variant: PotentiometerVariant.Rotary })]
    },
    {
        name: "servo",
        services: () => [new JDServiceHost(SRV_SERVO)]
    },
    {
        name: "slider",
        services: () => [new JDSensorServiceHost(SRV_POTENTIOMETER, { variant: PotentiometerVariant.Slider })]
    },
    {
        name: "thermometer",
        services: () => [new JDSensorServiceHost(SRV_THERMOMETER, thermometerOptions)]
    },
    {
        name: "vibration motor",
        services: () => [new JDServiceHost(SRV_VIBRATION_MOTOR)]
    }

];

export default function DeviceHostDialog(props: { onAdded?: () => void, onAddedAll?: () => void }) {
    const { onAdded, onAddedAll } = props;
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const [selected, setSelected] = useState("button");
    const { enqueueSnackbar } = useSnackbar();

    const addHost = (host: { name: string; services: () => JDServiceHost[]; }) => {
        const d = new JDDeviceHost(host.services());
        bus.addDeviceHost(d);
    }
    const handleChange = (ev: React.ChangeEvent<{ value: unknown }>) => {
        setSelected(ev.target.value as string);
    };
    const handleClick = () => {
        const host = hostDefinitions.find(h => h.name === selected);
        addHost(host);
        enqueueSnackbar(`${host.name} started...`, { variant: "info" })
        onAdded?.();
    }
    const handleAddAll = () => {
        hostDefinitions
            .forEach(addHost);
        enqueueSnackbar(`${hostDefinitions.length} devices started...`, { variant: "info" })
        onAddedAll?.();
    }

    return <Grid container spacing={2}>
        <Grid item xs={12}>
            <SelectWithLabel fullWidth={true} helperText={"Select the service that will run on the virtual device"} label={"Virtual device"} value={selected} onChange={handleChange}>
                {hostDefinitions.map((host) => <MenuItem key={host.name} value={host.name}>{host.name}</MenuItem>)}
            </SelectWithLabel>
        </Grid>
        <Grid item>
            <Button color="primary" variant="contained" title="Start new virtual device" onClick={handleClick} startIcon={<KindIcon kind={VIRTUAL_DEVICE_NODE_NAME} />}>
                start
            </Button>
        </Grid>
        <Grid item xs={12}>
            <Alert severity="info">
                Reload the page to clear out virtual devices.
                <Box component="span" ml={"0.5em"}><Button variant="outlined" onClick={handleAddAll}>Add all</Button></Box>
            </Alert>
        </Grid>
    </Grid>
}