import React, { useState, useEffect } from "react";
import { JDRegister } from "../../../src/dom/register";
import { Slider, Typography, Switch } from "@material-ui/core";
import { REPORT_UPDATE } from "../../../src/dom/constants";

export default function ReportRegister(props: { register: JDRegister }) {
    const { register } = props;
    const spec = register.specification;
    const [decoded, setDecoded] = useState(register.decode())

    useEffect(() => register.subscribe(REPORT_UPDATE, () => {
        setDecoded(register.decode())
    }))

    return <div>
        <Typography id="slider" gutterBottom>
            {spec.name}
        </Typography>
        {decoded && decoded.decoded.map(member => {
            if (member.info.type == "bool")
                return <Switch value={member.value} />
            else if (member.scaledValue !== undefined)
                return <Slider disabled value={member.scaledValue} aria-labelledby="slider" min={0} max={1} />
            else
               return member.humanValue
        })}
    </div>
}