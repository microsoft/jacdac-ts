import React, { useState, useEffect } from "react";
import { JDRegister } from "../../../src/dom/register";
import { Slider, Typography } from "@material-ui/core";
import { REPORT_UPDATE } from "../../../src/dom/constants";

export default function ReportRegister(props: { register: JDRegister }) {
    const { register } = props;
    const spec = register.specification;
    const [value, setValue] = useState(register.intValue || 0)

    useEffect(() => register.subscribe(REPORT_UPDATE, () => {
        const newValue = register.intValue;
        setValue(newValue)
    }))

    // todo: use decoded data
    const max = 1 << 16
    return <div>
        <Typography id="slider" gutterBottom>
            {spec.name}
        </Typography>
        <Slider disabled value={value} aria-labelledby="slider" min={0} max={max} />
    </div>
}