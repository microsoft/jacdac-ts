import React, { useState, useEffect } from "react";
import { JDRegister } from "../../../src/dom/register";
import { Slider, Typography, Switch, TextField, Select, MenuItem, Theme, createStyles, makeStyles } from "@material-ui/core";
import { DecodedMember, valueToFlags, flagsToValue } from "../../../src/dom/pretty";
import IDChip from "./IDChip"

const useStyles = makeStyles((theme: Theme) => createStyles({
    root: {
        marginRight: theme.spacing(1)
    }
}))

function MemberInput(props: { register?: JDRegister, member: DecodedMember, serviceSpecification: jdspec.ServiceSpec, specification: jdspec.PacketInfo, labelledby: string }) {
    const { register, member, labelledby, serviceSpecification, specification } = props;
    const { info } = member;
    const mod = specification.kind == "rw";
    const enumInfo = serviceSpecification?.enums[info.type]

    const readOnly = !register;
    const handleSwitch = () => register?.sendSetBoolAsync(!register.boolValue, true)
    const handleNumChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const v = parseInt(event.target.value.replace(/[^\d]+$/, ''));
        if (!isNaN(v))
            register.sendSetIntAsync(parseInt(event.target.value), true);
    }
    const handleEnumChange = (event: React.ChangeEvent<{ value: any }>) => {
        const v = enumInfo.isFlags ? flagsToValue(event.target.value) : event.target.value
        register.sendSetIntAsync(v, true);
    };

    if (info.type == "bool") {
        return <Switch checked={member.value} onClick={mod && handleSwitch} readOnly={readOnly} />
    }
    else if (enumInfo !== undefined && member.numValue !== undefined) {
        return <Select
            readOnly={readOnly}
            multiple={enumInfo.isFlags}
            value={enumInfo.isFlags ? valueToFlags(enumInfo, member.numValue) : member.numValue}
            onChange={handleEnumChange}>
            {Object.keys(enumInfo.members).map(n => <MenuItem key={n} value={enumInfo.members[n]}>{n} <IDChip id={enumInfo.members[n]} /></MenuItem>)}
        </Select>
    }
    else if (member.scaledValue !== undefined && info.unit == "frac") {
        return <Slider
            disabled={readOnly}
            value={member.scaledValue}
            aria-labelledby={labelledby}
            min={0} max={1}
        />
    }

    if (member.numValue !== undefined && mod)
        return <TextField type="number" label={member.numValue} onChange={handleNumChange} disabled={readOnly} />

    return <Typography component="div" variant="h5">{member.humanValue}</Typography>
}

export function DecodedMemberItem(props: { member: DecodedMember, serviceSpecification: jdspec.ServiceSpec, specification: jdspec.PacketInfo, register?: JDRegister }) {
    const { member, register, serviceSpecification, specification } = props;
    const { info } = member;
    const classes = useStyles()
    return <div className={classes.root}>
        {info.name !== "_" && <Typography id="slider" component="span" gutterBottom>
            {info.name}
        </Typography>}
        <MemberInput member={member} serviceSpecification={serviceSpecification} specification={specification} labelledby={"slider"} register={register} />
    </div>
}
