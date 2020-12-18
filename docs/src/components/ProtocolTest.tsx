import { Grid, Typography } from "@material-ui/core";
import React, { useContext } from "react";
import { cryptoRandomUint32, delay, toHex } from "../../../src/jdom/utils";
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import JACDACContext, { JDContextProps } from "../../../src/react/Context";
import { ProtoTestCmd, SRV_PROTO_TEST } from "../../../src/jdom/constants";
import useChange from "../jacdac/useChange"
import { JDService } from "../../../src/jdom/service";
import { JDRegister } from "../../../src/jdom/register";
import ConnectAlert from "./ConnectAlert";
import { JDField } from "../../../src/jdom/field";
import { jdpack, jdpackEqual, jdunpack } from "../../../src/jdom/pack";
import DeviceName from "./DeviceName";
import DeviceActions from "./DeviceActions";
import useEffectAsync from "./useEffectAsync";
import TestCard from "./TestCard";
import Packet from "../../../src/jdom/packet";
import { JDEvent } from "../../../src/jdom/event";
import { InPipeReader } from "../../../src/jdom/pipes";

function pick(...values: number[]) {
    return values.find(x => x !== undefined);
}

function randomRange(min: number, max: number) {
    return Math.round(Math.random() * (max - min) + min);
}

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

function randomPayload(packFormat: string, fields: JDField[]) {
    if (!packFormat)
        throw new Error("pack format unknown")
    const rs = fields.map(randomFieldPayload);
    if (rs.some(r => r === undefined))
        throw new Error("unsupported data layout")
    return rs;
}

function RegisterProtocolTest(props: { rw: JDRegister, ro: JDRegister, ev: JDEvent }) {
    const { rw, ro, ev } = props;
    const { specification, fields } = rw;
    const name = specification.name.replace(/^rw_/, "")

    const rxValue = (r: JDRegister) => jdunpack(r.data, specification.packFormat)
    const rwValue = useChange(rw, rxValue);
    const roValue = useChange(ro, rxValue);

    // event code and command code are the same as rw register
    useEffectAsync(async () => {
        await rw.sendGetAsync();
        await ro.sendGetAsync();
    }, []);

    const testRwRo = async (log) => {
        log(`testing rw`)
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
        log(`testing ro`)
        await ro.sendGetAsync();
        // wait for response
        await delay(100);
        const ropayload = jdunpack(ro.data, packFormat);
        log({ ropayload })
        if (!jdpackEqual(packFormat, payload, ropayload))
            throw new Error(`expected ro ${payload}, got ${ropayload}`)

        // the event should have triggered once
        if (evCount + 1 !== ev.count)
            throw new Error(`expected 1 event, got ${ev.count - evCount}`)
    }

    const testCommand = async (log) => {
        log(`testing cmd`)

        const packFormat = specification.packFormat;
        const payload = randomPayload(packFormat, fields);
        log({ payload })
        const data = jdpack(packFormat, payload);
        log({ data: toHex(data) })
        // send over cmd packet
        await rw.service.sendPacketAsync(Packet.from(rw.address, data))
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
        rw.service.registersUseAcks = false;
        await testRwRo(log);
        await testCommand(log);
        rw.service.registersUseAcks = true;
        await testRwRo(log);
        await testCommand(log);
    }

    return <TestCard title={name} subheader={specification.packFormat || "?"} onTest={test} />
}

function ServiceProtocolTest(props: { service: JDService }) {
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const { service } = props;
    const { device } = service;

    const regs = service.registers();
    const rws = service.registers().filter(reg => reg.specification.kind == "rw")
        .map(rw => {
            const roname = rw.name.replace(/^rw_/, "ro_");
            const ro = regs.find(r => r.specification.kind === "ro" && r.specification.name === roname)
            const ev = service.event(rw.address);
            return { rw, ro, ev }
        });

    const outPipeTest = async (log) => {
        const inp = new InPipeReader(bus)
        await service.sendPacketAsync(
            inp.openCommand(ProtoTestCmd.CReportPipe),
            true)
        log(`pipe connected`)

        let bytes: number[] = [];
        for (const buf of await inp.readData()) {
            const [byte] = jdunpack<[number]>(buf, "u8");
            bytes.push(byte);
            log(`byte ${byte.toString(16)}`)
        }
        log(`received ${bytes.length} bytes`)
   }

    return <Grid container spacing={1}>
        <Grid item xs={10}>
            <Typography variant="h4">
                <DeviceName device={device} />
            </Typography>
        </Grid>
        <Grid item xs={2}>
            <DeviceActions device={device} reset={true} />
        </Grid>
        {rws?.map(rw => <Grid key={rw.rw.id} item xs={12} md={6}><RegisterProtocolTest {...rw} /></Grid>)}
        <Grid key={"cpipe"} item xs={12} md={6}>
            <TestCard title={"out pipe"} subheader={""} onTest={outPipeTest} />
        </Grid>
    </Grid>
}

export default function ProtocolTest() {
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const services = useChange(bus, b => b.services({ serviceClass: SRV_PROTO_TEST }))

    return <Grid container direction="row" spacing={2}>
        <Grid key="connect" item xs={12}>
            <ConnectAlert serviceClass={SRV_PROTO_TEST} />
        </Grid>
        {services?.map(service => <Grid key={service.id} item xs={12}>
            <ServiceProtocolTest service={service} />
        </Grid>)}
    </Grid>
}