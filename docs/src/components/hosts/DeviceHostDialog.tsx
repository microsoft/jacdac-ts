import React, { useContext, useState } from "react";
import { Grid } from "@material-ui/core";
import { Button } from "gatsby-theme-material-ui";
import KindIcon from "../KindIcon";
import SelectWithLabel from "../ui/SelectWithLabel";
import ButtonServiceHost from "../../../../src/hosts/buttonservicehost";
import BuzzerServiceHost from "../../../../src/hosts/buzzerservicehost"
import ServoServiceHost from "../../../../src/hosts/servoservicehost"
import RotaryEncoderServiceHost from "../../../../src/hosts/rotaryencoderservicehost"
import MotorEncoderServiceHost from "../../../../src/hosts/motorservicehost"

import JDDeviceHost from "../../../../src/jdom/devicehost";
import { MenuItem } from '@material-ui/core';
import JACDACContext, { JDContextProps } from "../../../../src/react/Context";
import { VIRTUAL_DEVICE_NODE_NAME } from "../../../../src/jdom/constants";
import Alert from "../ui/Alert";

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
        name: "motor",
        services: () => [new MotorEncoderServiceHost()]
    },
    {
        name: "servo",
        services: () => [new ServoServiceHost()]
    },
    {
        name: "rotary encoder",
        services: () => [new RotaryEncoderServiceHost()]
    },
    {
        name: "rotary encoder + button",
        services: () => [new RotaryEncoderServiceHost(), new ButtonServiceHost()]
    },
];

export default function DeviceHostDialog(props: { onAdded: () => void }) {
    const { onAdded } = props;
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const [selected, setSelected] = useState("button");

    const handleChange = (ev: React.ChangeEvent<{ value: unknown }>) => {
        setSelected(ev.target.value as string);
    };
    const handleClick = () => {
        const host = hostDefinitions.find(h => h.name === selected);
        const d = new JDDeviceHost(host.services());
        bus.addDeviceHost(d);
        onAdded();
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
            </Alert>
        </Grid>
    </Grid>
}