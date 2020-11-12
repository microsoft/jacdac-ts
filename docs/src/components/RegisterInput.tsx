import React, { useState, useEffect } from "react";
import { JDRegister } from "../../../src/jdom/register";
import { Slider, Typography, Switch, TextField, Select, MenuItem } from "@material-ui/core";
import { REPORT_UPDATE } from "../../../src/jdom/constants";
import { DecodedMember, valueToFlags, flagsToValue } from "../../../src/jdom/pretty";
import { debouncedPollAsync } from "../../../src/jdom/utils";
import IDChip from "./IDChip"
import DeviceName from "./DeviceName";
import { DecodedMemberItem } from "./DecodedMemberItem";

export default function RegisterInput(props: { register: JDRegister, showDeviceName?: boolean, showName?: boolean, showMemberName?: boolean }) {
    const { register, showName, showMemberName, showDeviceName } = props;
    const [decoded, setDecoded] = useState(register.decoded)

    // keep reading
    useEffect(() => debouncedPollAsync(() => {
        if (register.specification?.kind === "const" && register.data !== undefined)
            return Promise.resolve();
        return register.sendGetAsync()
    }, register.data ? 5000 : 500), [register])

    // decode...
    useEffect(() => register.subscribe(REPORT_UPDATE, () => {
        setDecoded(register.decoded)
    }), [register])

    return <>
        {showDeviceName && <Typography component="span" key="devicenamename">
            <DeviceName device={register.service.device} />/
        </Typography>}
        {showName && !!decoded && <Typography component="span" key="registername" gutterBottom>
            {decoded.info.name}
        </Typography>}
        {decoded && decoded.decoded.map(member =>
            <DecodedMemberItem key={`member` + member.info.name} register={register} member={member} serviceSpecification={decoded.service} specification={decoded.info} />)}
    </>
}