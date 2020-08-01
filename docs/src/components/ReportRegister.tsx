import React, { useState, useEffect } from "react";
import { JDRegister } from "../../../src/dom/register";
import { Slider, Typography, Switch } from "@material-ui/core";
import { REPORT_UPDATE } from "../../../src/dom/constants";
import { DecodedMember } from "../../../src/dom/pretty";

function MemberInput(props: { member: DecodedMember, labelledby: string }) {
    const { member, labelledby } = props;
    const { info } = member;
    if (info.type == "bool")
        return <Switch checked={member.value} />
    else if (member.numValue !== undefined && info.storage > 0) {
        return <Slider value={member.numValue}
            aria-labelledby={labelledby}
            min={0} max={1 << (8 * member.size)}
        />
    }

    return <Typography variant="h4">{member.humanValue}</Typography>
}

function Decoded(props: { member: DecodedMember }) {
    const { member } = props;
    const { info } = member;
    return <React.Fragment>
        {info.name !== "_" && <Typography id="slider" gutterBottom>
            {info.name}
        </Typography>}
        <MemberInput member={member} labelledby={"slider"} />
    </React.Fragment>
}

export default function ReportRegister(props: { register: JDRegister }) {
    const { register } = props;
    const [decoded, setDecoded] = useState(register.decode())

    useEffect(() => register.subscribe(REPORT_UPDATE, () => {
        setDecoded(register.decode())
    }))

    return <React.Fragment>
        {!!decoded && <Typography gutterBottom>
            {decoded.info.name}
        </Typography>}
        {decoded && decoded.decoded.map(member =>
            <Decoded member={member} />)}
    </React.Fragment>
}