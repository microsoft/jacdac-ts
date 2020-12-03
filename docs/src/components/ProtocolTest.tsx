import { Card, CardActions, CardContent, CardHeader, Grid } from "@material-ui/core";
import React, { useContext } from "react";
import { cryptoRandomUint32, toHex } from "../../../src/jdom/utils";
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import JACDACContext, { JDContextProps } from "../../../src/react/Context";
import { SRV_PROTOCOL_TEST } from "../../../src/jdom/constants";
import useChange from "../jacdac/useChange"
import { JDService } from "../../../src/jdom/service";
import { JDRegister } from "../../../src/jdom/register";
import CmdButton from "./CmdButton"
import RegisterInput from "./RegisterInput";
import ConnectAlert from "./ConnectAlert";
import { JDField } from "../../../src/jdom/field";
import { jdpack } from "../../../src/jdom/pack";


function pick(...values: number[]) {
    return values.find(x => x !== undefined);
}

function randomRange(min: number, max: number) {
    return Math.round(Math.random() * (max - min) + min);
}

function randomFieldPayload(field: JDField) {
    const { specification } = field;
    let r: any = undefined;
    if (specification.isSimpleType) {
        switch (specification.type) {
            case "i8":
            case "i16":
            case "i32":
            case "u8":
            case "u16":
            case "u32": {
                const unsigned = specification.type[0] === "u";
                const n = parseInt(specification.type.slice(1));
                const min = pick(specification.typicalMin, specification.absoluteMin, unsigned ? 0 : -((1 << (n - 1)) - 1));
                const max = pick(specification.typicalMax, specification.absoluteMax, unsigned ? (1 << n) - 1 : (1 << (n - 1)) - 1);
                r = randomRange(min, max);
                break;
            }
            case "bytes": {
                // maxBytes?
                const a = cryptoRandomUint32(randomRange(1, 3));
                r = new Uint8Array(a.buffer);
                break;
            }
            case "string":
            case "string0": {
                const ch_a = "a".charCodeAt(0);
                const ch_z = "z".charCodeAt(0)
                const n = randomRange(4, 10);
                let s = ""
                for (let i = 0; i < n; ++i) {
                    s += String.fromCharCode(randomRange(ch_a, ch_z));
                }
                r = s;
                break;
            }
        }
    } else {
        console.log('complex type not supported')
    }

    return r;
}

function randomPayload(fields: JDField[]) {
    return fields.map(randomFieldPayload);
}

function RegisterProtocolTest(props: { rw: JDRegister, ro: JDRegister }) {
    const { rw, ro } = props;
    const { specification, fields } = rw;
    const name = specification.name.replace(/^rw_/, "")
    
    const handleClick = async () => {
        const payload = randomPayload(fields);
        if (!payload) throw "data layout not supported"
        if (!specification.packFormat) throw "format unknown"

        const data = jdpack(specification.packFormat, payload);
        const xdata = toHex(data);
        console.log({ payload, data: xdata })
        // send over packet
        await rw.sendSetAsync(data, true);
        // read packet
        await rw.sendGetAsync();
        // check read
        const rwData = toHex(rw.data)
        if (rwData !== xdata)
            throw `expected rw ${xdata}, got ${rwData}`
        // check ro
        await ro.sendGetAsync();
        const roData = toHex(rw.data)
        if (roData !== xdata)
            throw `expected ro ${xdata}, got ${roData}`
    }

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