import React, { useState, useEffect } from "react";
import { JDRegister } from "../../../src/dom/register";
import { Slider, Typography, Switch } from "@material-ui/core";
import { REPORT_UPDATE } from "../../../src/dom/constants";
import { DecodedMember } from "../../../src/dom/pretty";

function MemberInput(props: { member: DecodedMember, labelledby: string }) {
    const { member, labelledby } = props;
    if (member.info.type == "bool")
        return <Switch value={member.value} />
    else if (member.scaledValue !== undefined)
        return <Slider disabled value={member.scaledValue} aria-labelledby={labelledby} min={0} max={1} />
    else
        return <span>{member.humanValue}</span>
}

function Decoded(props: { member: DecodedMember }) {
    const { member } = props;
    return <div>
        <Typography id="slider" gutterBottom>
            {member.description}
        </Typography>
        <MemberInput member={member} labelledby={"slider"} />
    </div>
}

export default function ReportRegister(props: { register: JDRegister }) {
    const { register } = props;
    const spec = register.specification;
    const [decoded, setDecoded] = useState(register.decode())

    useEffect(() => register.subscribe(REPORT_UPDATE, () => {
        setDecoded(register.decode())
    }))

    return <div>
        {decoded && decoded.decoded.map(member =>
            <Decoded member={member} />)}
    </div>
}