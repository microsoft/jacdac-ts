import { Grid, Switch, Typography } from "@material-ui/core";
import React, { useContext, useEffect, useState } from "react";
import { bufferEq, cryptoRandomUint32, delay, pick, randomRange, toHex } from "../../../../src/jdom/utils";
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import JacdacContext, { JDContextProps } from "../../../../src/react/Context";
import { ProtoTestCmd, ProtoTestReg, SRV_PROTO_TEST } from "../../../../src/jdom/constants";
import useChange from "../../jacdac/useChange"
import { JDService } from "../../../../src/jdom/service";
import { JDRegister } from "../../../../src/jdom/register";
import ConnectAlert from "../alert/ConnectAlert";
import { JDField } from "../../../../src/jdom/field";
import { jdpack, jdpackEqual, jdunpack } from "../../../../src/jdom/pack";
import DeviceName from "../DeviceName";
import DeviceActions from "../DeviceActions";
import useEffectAsync from "../useEffectAsync";
import TestCard from "../TestCard";
import Packet from "../../../../src/jdom/packet";
import { JDEvent } from "../../../../src/jdom/event";
import { AlertTitle } from "@material-ui/lab";
import Alert from "../ui/Alert";
import JDDeviceHost from "../../../../src/jdom/devicehost";
import ProtocolTestServiceHost from "../../../../src/jdom/protocoltestservicehost"

function randomFieldPayload(field: JDField) {
    const { specification } = field;
    let r: any = undefined;
    switch (specification.type) {
        case "bool":
            r = Math.random() > 0.5 ? 1 : 0;
            break;
        case "i8":
        case "i16":
        case "i32":
        case "u8":
        case "u16":
        case "u32": {
            const unsigned = specification.type[0] === "u";
            const n = Math.min(30, parseInt(specification.type.slice(1)));
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

    return r;
}

function randomPayload<T extends any[]>(packFormat: string, fields: JDField[]): T {
    if (!packFormat)
        throw new Error("pack format unknown")
    const rs = fields.map(randomFieldPayload);
    if (rs.some(r => r === undefined))
        throw new Error("unsupported data layout")
    return rs as T;
}

function RegisterProtocolTest(props: { rw: JDRegister, ro: JDRegister, ev: JDEvent }) {
    const { rw, ro, ev } = props;
    const { specification, fields } = rw;
    const name = specification.name.replace(/^rw_/, "")

    const rxValue = (r: JDRegister) => jdunpack(r.data, specification.packFormat)

    // event code and command code are the same as rw register
    useEffectAsync(async () => {
        await rw.sendGetAsync();
        await ro.sendGetAsync();
    }, []);

    const testRwRo = async (log) => {
        log(`-- testing rw`)
        const packFormat = specification.packFormat;
        const payload = randomPayload(packFormat, fields);
        log({ payload })

        const data = jdpack(packFormat, payload);
        log({ data: toHex(data) })

        // setup observer for event counts
        const evCount = ev.count;

        // send over packet
        await rw.sendSetAsync(data);
        // read packet
        await rw.sendGetAsync();
        // wait for response
        await delay(100);
        // check read
        log({ rwdata: toHex(rw.data) });
        const rwpayload = jdunpack(rw.data, packFormat);
        log({ rwpayload });
        if (!jdpackEqual(packFormat, payload, rwpayload))
            throw new Error(`expected rw ${payload}, got ${rwpayload}`)

        // check ro
        log(`-- testing ro`)
        await ro.sendGetAsync();
        // wait for response
        await delay(100);
        const ropayload = jdunpack(ro.data, packFormat);
        log({ ropayload })
        if (!jdpackEqual(packFormat, payload, ropayload))
            throw new Error(`expected ro ${payload}, got ${ropayload}`)

        // the event should have triggered once
        log(`-- testing event`)
        if (packFormat !== "u8" && evCount + 1 !== ev.count)
            throw new Error(`expected 1 event, got ${ev.count - evCount}`)
    }

    const testCommand = async (log) => {
        log(`-- testing cmd`)

        const packFormat = specification.packFormat;
        const payload = randomPayload(packFormat, fields);
        log({ payload })
        const data = jdpack(packFormat, payload);
        log({ data: toHex(data) })
        // send over cmd packet
        await rw.service.sendPacketAsync(Packet.from(rw.code, data))
        // read packet
        await rw.sendGetAsync();
        // wait for response
        await delay(100);
        // check read
        log({ rwdata: toHex(rw.data) });
        const rwpayload = jdunpack(rw.data, packFormat);
        log({ rwpayload });
        if (!jdpackEqual(packFormat, payload, rwpayload))
            throw new Error(`expected rw ${payload}, got ${rwpayload}`)
    }

    const test = async (log) => {
        log(`- testing no acks`)
        rw.service.registersUseAcks = false;
        await testRwRo(log);
        await testCommand(log);
        log(`- testing acks`)
        rw.service.registersUseAcks = true;
        await testRwRo(log);
        await testCommand(log);
    }

    return <TestCard title={name} subheader={specification.packFormat || "?"} onTest={test} />
}

function ServiceProtocolTest(props: { service: JDService }) {
    const { service } = props;
    const { device } = service;

    const regs = service.registers();
    const rws = service.registers().filter(reg => reg.specification.kind == "rw")
        .map(rw => {
            const roname = rw.name.replace(/^rw_/, "ro_");
            const ro = regs.find(r => r.specification.kind === "ro" && r.specification.name === roname)
            const ev = service.event(rw.code);
            return { rw, ro, ev }
        });

    const outPipeTest = async (log) => {
        // fill bytes with data
        const rw = service.register(ProtoTestReg.RwBytes);
        const [data] = randomPayload<[Uint8Array]>("b", rw.fields);
        log(`data: ${toHex(data)}`)
        // send over cmd packet
        rw.service.registersUseAcks = true;
        await rw.sendSetAsync(data);
        await rw.sendGetAsync();
        // wait for response
        await delay(100);
        log(`data recv: ${toHex(rw.data)}`)
        if (!bufferEq(data, rw.data))
            throw new Error(`rw write failed, expected ${toHex(data)}, got ${toHex(rw.data)}`);
        // read packet back
        const recv = await service.receiveWithInPipe<[number]>(ProtoTestCmd.CReportPipe, "u8")
        const recvu = new Uint8Array(recv.map(buf => buf[0]));
        log(`received ${toHex(recvu)}`)
        if (!bufferEq(data, recvu))
            throw new Error(`expected ${toHex(data)}, got ${toHex(recv.map(buf => buf[0]))}`)
    }

    return <Grid container spacing={1}>
        <Grid item xs={10}>
            <Typography variant="h4">
                <DeviceName device={device} />
            </Typography>
        </Grid>
        <Grid item xs={2}>
            <DeviceActions device={device} showReset={true} />
        </Grid>
        {rws?.map(rw => <Grid key={rw.rw.id} item xs={12} md={6}><RegisterProtocolTest {...rw} /></Grid>)}
        <Grid key={"cpipe"} item xs={12} md={6}>
            <TestCard title={"out pipe"} subheader={""} onTest={outPipeTest} />
        </Grid>
    </Grid>
}

export default function ProtocolTest() {
    const { bus } = useContext<JDContextProps>(JacdacContext)
    const [host, setHost] = useState(false);
    const services = useChange(bus, b => b.services({ serviceClass: SRV_PROTO_TEST }))

    const toggleHost = () => setHost(!host);

    // add virtual device
    useEffect(() => {
        if (!host)
            return () => { };

        const d = new JDDeviceHost([new ProtocolTestServiceHost()]);
        bus.addDeviceHost(d);
        return () => bus.removeDeviceHost(d);
    }, [host]);

    return <Grid container direction="row" spacing={2}>
        <Grid key="connect" item xs={12}>
            <ConnectAlert serviceClass={SRV_PROTO_TEST} />
        </Grid>
        {services?.map(service => <Grid key={service.id} item xs={12}>
            <ServiceProtocolTest service={service} />
        </Grid>)}
        <Grid item xs={12}>
            <Alert severity="info">
                <AlertTitle>Developer zone</AlertTitle>
                <Switch checked={host} onChange={toggleHost} />
                <label>Add simulator</label>
            </Alert>
        </Grid>
    </Grid>
}