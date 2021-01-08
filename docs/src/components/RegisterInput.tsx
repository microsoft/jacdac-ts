import { Box, Typography } from "@material-ui/core";
import DeviceName from "./DeviceName";
import Alert from "./ui/Alert";
import React, { useContext, useEffect, useState } from "react";
// tslint:disable-next-line: no-submodule-imports
import { JDRegister } from "../../../src/jdom/register";
import { REPORT_UPDATE, SystemReg } from "../../../src/jdom/constants";
import AppContext from "./AppContext";
import MembersInput from "./fields/MembersInput";
import RegisterTrend from "./RegisterTrend";
import IconButtonWithProgress from "./ui/IconButtonWithProgress"

export type RegisterInputVariant = "widget" | ""

export default function RegisterInput(props: {
    register: JDRegister,
    showDeviceName?: boolean,
    showServiceName?: boolean,
    showRegisterName?: boolean,
    hideMissingValues?: boolean,
    showTrend?: boolean,
    showDataType?: boolean,
    variant?: RegisterInputVariant
}) {
    const { register, showRegisterName, showDeviceName, showServiceName, hideMissingValues, showTrend, showDataType, variant } = props;
    const { service, specification } = register;
    const { device } = service;
    const { fields } = register;
    const { setError: setAppError } = useContext(AppContext)
    const [working, setWorking] = useState(false);
    const [args, setArgs] = useState<any[]>(register.unpackedValue || [])
    const hasSet = specification.kind === "rw";
    const hasData = !!register.data;
    const color = hasSet ? "secondary" : "primary"
    const name = specification?.name?.replace(/_/g, ' ')

    useEffect(() => register.subscribe(REPORT_UPDATE, () => {
        const vs = register.unpackedValue
        if (vs !== undefined)
            setArgs(vs);
    }), [register]);
    const handleRefresh = () => {
        register.refresh(true);
    }
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

    if (hideMissingValues && !hasData)
        return null;

    return <>
        {showDeviceName && <Typography component="span" key="devicenamename">
            <DeviceName device={device} />/
    </Typography>}
        {showServiceName && specification && <Typography variant="caption" key="servicename">
            {register.service.name.toLocaleLowerCase().replace(/_/g, ' ') + " "}
        </Typography>}
        {showRegisterName && specification && <Typography variant="caption" key="registername">
            {specification.name.replace(/_/g, ' ')}
        </Typography>}
        {!hasData && <Box>
            <IconButtonWithProgress title="refresh" indeterminate={true} onClick={handleRefresh} />
        </Box>}
        {showTrend && hasData && <RegisterTrend register={register} mini={false} horizon={24} />}
        {hasData && <MembersInput
            color={color}
            serviceSpecification={service.specification}
            serviceMemberSpecification={specification}
            specifications={fields.map(f => f.specification)}
            values={args}
            setValues={hasSet && sendArgs}
            showDataType={showDataType}
            variant={variant}
        />}
    </>
}
