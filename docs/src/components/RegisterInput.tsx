import React, { useState, useEffect } from "react";
import { JDRegister } from "../../../src/dom/register";
import { Slider, Typography, Switch } from "@material-ui/core";
import { REPORT_UPDATE } from "../../../src/dom/constants";
import { DecodedMember } from "../../../src/dom/pretty";
import { debounceAsync } from "../../../src/dom/utils";

function MemberInput(props: { member: DecodedMember, labelledby: string }) {
    const { member, labelledby } = props;
    const { info } = member;
    if (info.type == "bool")
        return <Switch checked={member.value} />
    else if (member.numValue !== undefined && info.unit == "frac" && info.storage > 0) {
        return <Slider value={member.numValue}
            aria-labelledby={labelledby}
            min={0} max={1 << (8 * member.size)}
        />
    }
    return <Typography variant="h5">{member.humanValue}</Typography>
}

function Decoded(props: { member: DecodedMember, showName?: boolean }) {
    const { member, showName } = props;
    const { info } = member;
    return <React.Fragment>
        {info.name !== "_" && <Typography id="slider" gutterBottom>
            {info.name}
        </Typography>}
        <MemberInput member={member} labelledby={"slider"} />
    </React.Fragment>
}

export default function RegisterInput(props: { register: JDRegister, showDeviceName?: boolean, showName?: boolean, showMemberName?: boolean }) {
    const { register, showName, showMemberName, showDeviceName } = props;
    const [decoded, setDecoded] = useState(register.decode())

    // keep reading
    useEffect(() => debounceAsync(() => register.sendGetAsync(), 500))

    // decode...
    useEffect(() => register.subscribe(REPORT_UPDATE, () => {
        setDecoded(register.decode())
    }))

    return <React.Fragment>
        {showDeviceName && <Typography>
            {register.service.device.name}/
        </Typography>}
        {showName && !!decoded && <Typography gutterBottom>
            {decoded.info.name}
        </Typography>}
        {decoded && decoded.decoded.map(member =>
            <Decoded member={member} showName={showMemberName} />)}
    </React.Fragment>
}