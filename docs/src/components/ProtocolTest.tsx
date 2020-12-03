import { Card, CardActions, CardContent, CardHeader, Grid, TextField, Typography } from "@material-ui/core";
import React, { ChangeEvent, useContext, useMemo, useState } from "react";
import { clone, SMap, uniqueName } from "../../../src/jdom/utils";
import useLocalStorage from "./useLocalStorage";
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import DeleteIcon from '@material-ui/icons/Delete';
import { serviceSpecificationFromClassIdentifier } from "../../../src/jdom/spec";
import AddServiceIconButton from "./AddServiceIconButton";
import ServiceSpecificationSelect from "./ServiceSpecificationSelect"
import { DTDL_CONTEXT, escapeName, serviceSpecificationToComponent } from "../../../src/azure-iot/dtdl"
import IconButtonWithTooltip from "./IconButtonWithTooltip";
import Snippet from "./Snippet";
import PaperBox from "./PaperBox";
import Alert from "./Alert"
import JACDACContext, { JDContextProps } from "../../../src/react/Context";
import { SRV_PROTOCOL_TEST } from "../../../src/jdom/constants";
import useChange from "../jacdac/useChange"
import { JDService } from "../../../src/jdom/service";
import { JDRegister } from "../../../src/jdom/register";
import CmdButton from "./CmdButton"
import RegisterInput from "./RegisterInput";
import ConnectAlert from "./ConnectAlert";

function RegisterProtocolTest(props: { rw: JDRegister, ro: JDRegister }) {
    const { rw, ro } = props;
    const name = rw.specification.name.replace(/^rw_/,"")

    const handleClick = async () => {
        // generate random data
        // set register
    };

    return <Card>
        <CardHeader title={name} />
        <CardContent>
            <RegisterInput register={rw} showDeviceName={false} showName={true} />
            <RegisterInput register={ro} showDeviceName={false} showName={true} />
        </CardContent>
        <CardActions>
            <CmdButton onClick={handleClick}>Write RW</CmdButton>
        </CardActions>
    </Card>
}

function ServiceProtocolTest(props: { service: JDService }) {
    const { service } = props;

    const regs = service.registers();
    const rws = service.registers().filter(reg => reg.specification.kind == "rw")
        .map(rw => {
            const roname = rw.name.replace(/^rw_/, "ro_");
            const ro = regs.find(r => r.specification.kind === "ro" && r.specification.name === roname)
            return { rw, ro }
        });

    return <>
        {service.device.name}
        {rws?.map(rw => <RegisterProtocolTest key={rw.rw.id} {...rw} />)}
    </>
}

export default function ProtocolTest() {
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const services = useChange(bus, b => b.services({ serviceClass: SRV_PROTOCOL_TEST }))

    return <Grid container direction="row" spacing={2}>
        <ConnectAlert serviceClass={SRV_PROTOCOL_TEST} />
        {services?.map(service => <Grid key={service.id} item>
            <ServiceProtocolTest service={service} />
        </Grid>)}
    </Grid>
}