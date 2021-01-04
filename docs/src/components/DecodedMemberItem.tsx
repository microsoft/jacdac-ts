import React, { useState, useEffect, useContext, ChangeEvent } from "react";
import { JDRegister } from "../../../src/jdom/register";
import { Slider, Typography, Switch, TextField, Select, MenuItem, Theme, createStyles, makeStyles } from "@material-ui/core";
import { DecodedMember, valueToFlags, flagsToValue } from "../../../src/jdom/pretty";
import IDChip from "./IDChip"
import AppContext from "./AppContext"
import { useId } from "react-use-id-hook"
import { scaleFloatToInt } from "../../../src/jdom/spec";
import { fromHex } from "../../../src/jdom/utils";

const useStyles = makeStyles((theme: Theme) => createStyles({
    root: {
        marginRight: theme.spacing(1)
    }
}))

function MemberInput(props: {
    register?: JDRegister,
    member: DecodedMember,
    serviceSpecification: jdspec.ServiceSpec,
    registerSpecification: jdspec.PacketInfo,
    specification: jdspec.PacketMember,
    labelledby: string
}) {
    const { register, member, labelledby, serviceSpecification, registerSpecification, specification } = props;
    const { setError: setAppError } = useContext(AppContext)
    const [working, setWorking] = useState(false)
    const mod = registerSpecification.kind === "rw";
    const enumInfo = serviceSpecification?.enums[specification.type]

    const readOnly = !register || !mod;
    const workingIndicator = working ? "*" : ""

    const handeler = (handler: (ev: any) => Promise<void>) => async (ev: any) => {
        try {
            setWorking(true)
            await handler(ev)
        }
        catch (e) {
            setAppError(e)
        } finally {
            setWorking(false)
        }
    }

    const handleSwitchChange = handeler(async () => await register.sendSetBoolAsync(!register.boolValue, true))
    const handleNumChange = handeler(async (event: ChangeEvent<HTMLInputElement>) => {
        const v = parseInt(event.target.value.replace(/[^\d]+$/, ''));
        if (!isNaN(v))
            await register.sendSetPackedAsync(registerSpecification.packFormat, [v], true)
    })
    const handleEnumChange = handeler(async (event: ChangeEvent<{ value: any }>) => {
        const v = enumInfo.isFlags ? flagsToValue(event.target.value) : event.target.value
        await register.sendSetPackedAsync(registerSpecification.packFormat, [v], true)
    })
    const handleStringChange = handeler(async (event: ChangeEvent<HTMLInputElement>) => {
        const s = event.target.value as string;
        await register.sendSetStringAsync(s, true);
    })
    const handleSliderChange = async (event: any, newValue: number | number[]) => {
        const v = scaleFloatToInt((newValue as number) / 100, member.info)
        await register.sendSetPackedAsync(registerSpecification.packFormat, [v], true)
    }
    const handleBufferChange = handeler(async (event: ChangeEvent<HTMLInputElement>) => {
        const s = event.target.value as string;
        const buf = fromHex(s);
        await register.sendSetPackedAsync("b", [buf], true);
    })

    if (specification.type === "bool")
        return <Switch checked={member.value} onClick={mod ? handleSwitchChange : undefined} readOnly={readOnly} />
    else if (specification.type === "string")
        return <TextField disabled={readOnly} value={member?.value || ""} onChange={mod ? handleStringChange : undefined} />
    else if (enumInfo !== undefined && member.numValue !== undefined) {
        return <Select
            readOnly={readOnly}
            multiple={enumInfo.isFlags}
            value={enumInfo.isFlags ? valueToFlags(enumInfo, member.numValue) : member.numValue}
            onChange={handleEnumChange}>
            {Object.keys(enumInfo.members).map(n => <MenuItem key={n} value={enumInfo.members[n]}>{n}
                <IDChip id={enumInfo.members[n]} /></MenuItem>)}
        </Select>
    }
    else if (member?.scaledValue !== undefined && specification.unit === "/") {
        return <Slider
            disabled={readOnly}
            value={member.scaledValue * 100}
            onChange={handleSliderChange}
            aria-labelledby={labelledby}
            min={0} max={100}
        />
    }
    else if (member?.numValue !== undefined)
        return <TextField type="number" label={member.numValue + workingIndicator} onChange={handleNumChange} disabled={readOnly} />
    else if (specification.type === "bytes")
        return <TextField disabled={readOnly} value={member?.value || ""} onChange={mod ? handleBufferChange : undefined} />

    console.log("memberinput unhandled", { member })
    return <Typography component="div" variant="body2">{member.humanValue + workingIndicator}</Typography>
}

export function DecodedMemberItem(props: {
    member: DecodedMember,
    serviceSpecification: jdspec.ServiceSpec,
    registerSpecification: jdspec.PacketInfo,
    specification: jdspec.PacketMember,
    register?: JDRegister
}) {
    const { member, register, serviceSpecification, registerSpecification, specification } = props;
    const classes = useStyles()
    const id = useId();

    return <div className={classes.root}>
        {specification.name !== "_" && <Typography id={id} component="div" variant="caption">
            {specification.name}
        </Typography>}
        <MemberInput member={member}
            serviceSpecification={serviceSpecification}
            registerSpecification={registerSpecification}
            specification={specification}
            labelledby={id}
            register={register} />
    </div>
}
