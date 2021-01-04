import React, {  } from "react";
import { JDRegister } from "../../../src/jdom/register";
import { Typography } from "@material-ui/core";
import DeviceName from "./DeviceName";
import PacketInput from "./PacketInput";

export default function RegisterInput(props: {
    register: JDRegister, 
    showDeviceName?: boolean,
    showRegisterName?: boolean,
    showMemberName?: boolean
}) {
    const { register, showRegisterName, showDeviceName, showMemberName } = props;
    const { service, specification } = register;
    const { device } = service;

    return <>
        {showDeviceName && <Typography component="span" key="devicenamename">
            <DeviceName device={device} />/
        </Typography>}
        {showRegisterName && specification && <Typography variant="caption" key="registername">
            {specification.name}
        </Typography>}
        <PacketInput register={register} />
    </>
}