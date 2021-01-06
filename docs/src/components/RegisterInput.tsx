import { Typography } from "@material-ui/core";
import DeviceName from "./DeviceName";
import Alert from "./ui/Alert";
import React, { useContext, useEffect, useState } from "react";
// tslint:disable-next-line: no-submodule-imports
import { JDRegister } from "../../../src/jdom/register";
import { REPORT_UPDATE } from "../../../src/jdom/constants";
import AppContext from "./AppContext";
import MembersInput from "./fields/MembersInput";

function FieldsInput(props: {
    register: JDRegister
}) {
    const { register } = props;
    const { specification, service } = register;
    const { fields } = register;
    const { setError: setAppError } = useContext(AppContext)
    const [working, setWorking] = useState(false);
    const [args, setArgs] = useState<any[]>(register.unpackedValue || [])
    const hasSet = specification.kind === "rw";

    useEffect(() => register.subscribe(REPORT_UPDATE, () => {
        const vs = register.unpackedValue
        if (vs !== undefined)
            setArgs(vs);
    }), [register]);

    const sendArgs = async (values: any[]) => {
        if (working) return;
        try {
            setWorking(true)
            await register.sendSetPackedAsync(specification.packFormat, values, true);
        }
        catch (e) {
            setAppError(e)
        } finally {
            setWorking(false)
        }
    }

    if (!specification)
        return <Alert severity="error">{`Unknown member ${register.service}:${register.address}`}</Alert>

    if (!fields.length)
        return null; // nothing to see here

    return <MembersInput
        serviceSpecification={service.specification}
        specifications={fields.map(f => f.specification)}
        values={args}
        setValues={hasSet && sendArgs} />
}

export default function RegisterInput(props: {
    register: JDRegister,
    showDeviceName?: boolean,
    showRegisterName?: boolean
}) {
    const { register, showRegisterName, showDeviceName } = props;
    const { service, specification } = register;
    const { device } = service;

    return <>
        {showDeviceName && <Typography component="span" key="devicenamename">
            <DeviceName device={device} />/
        </Typography>}
        {showRegisterName && specification && <Typography variant="caption" key="registername">
            {specification.name}
        </Typography>}
        <FieldsInput register={register} />
    </>
}
