import React, { useState, useEffect } from "react";
import { JDRegister } from "../../../src/jdom/register";
import { Typography } from "@material-ui/core";
import { REPORT_UPDATE } from "../../../src/jdom/constants";
import DeviceName from "./DeviceName";
import { DecodedMemberItem } from "./DecodedMemberItem";

export default function RegisterInput(props: { register: JDRegister, showDeviceName?: boolean, showName?: boolean }) {
    const { register, showName, showDeviceName } = props;
    const [decoded, setDecoded] = useState(register.decoded)

    // decode, refresh happens automatically
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