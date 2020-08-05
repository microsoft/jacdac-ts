import React, { useState, useEffect } from "react";
import { JDRegister } from "../../../src/dom/register";
import { Slider, Typography, Switch } from "@material-ui/core";
import { REPORT_UPDATE } from "../../../src/dom/constants";
import { DecodedMember } from "../../../src/dom/pretty";
import { debouncedPollAsync } from "../../../src/dom/utils";

function MemberInput(props: { register: JDRegister, member: DecodedMember, labelledby: string }) {
    const { register, member, labelledby } = props;
    const { specification } = register
    const { info } = member;
    const handleSwitch = () => register.sendSetBoolAsync(!register.boolValue);
    if (info.type == "bool") {
        const mod = specification.kind == "rw"
        return <Switch checked={member.value} onClick={mod && handleSwitch} />
    }
    else if (member.numValue !== undefined && info.unit == "frac" && info.storage > 0) {
        return <Slider value={member.numValue}
            aria-labelledby={labelledby}
            min={0} max={1 << (8 * member.size)}
        />
    }
    return <Typography variant="h5">{member.humanValue}</Typography>
}

function Decoded(props: { member: DecodedMember, showName?: boolean, register: JDRegister }) {
    const { member, showName, register } = props;
    const { info } = member;
    return <React.Fragment>
        {info.name !== "_" && <Typography id="slider" gutterBottom>
            {info.name}
        </Typography>}
        <MemberInput member={member} labelledby={"slider"} register={register} />
    </React.Fragment>
}

export default function RegisterInput(props: { register: JDRegister, showDeviceName?: boolean, showName?: boolean, showMemberName?: boolean }) {
    const { register, showName, showMemberName, showDeviceName } = props;
    const [decoded, setDecoded] = useState(register.decode())

    // keep reading
    useEffect(() => debouncedPollAsync(() => register.sendGetAsync(), 50))

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
            <Decoded register={register} member={member} showName={showMemberName} />)}
    </React.Fragment>
}