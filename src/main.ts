import * as U from "./pxtutils"
import * as HF2 from "./hf2"
import * as jd from "./jd"
import * as jdpretty from "./jdpretty"
import * as jdbl from "./jdbl"
import { program as commander } from "commander"
import * as fs from "fs"

const dev_ids = {
    "119c5abca9fd6070": "JDM3.0-ACC-burned",
    "ffc91289c5dc5280": "JDM3.0-ACC",
    "766ccc5755a22eb4": "JDM3.0-LIGHT",
    "259ab02e98bc2752": "F840-0",
    "69a9eaeb1a7d2bc0": "F840-1",
    "08514ae8a1995a00": "KITTEN-0",
    "XEOM": "DEMO-ACC-L",
    "OEHM": "DEMO-ACC-M",
    "MTYV": "DEMO-LIGHT",
    "ZYQT": "DEMO-MONO",
    "XMMW": "MB-BLUE",
    "CJFN": "DEMO-CPB",
}

U.jsonCopyFrom(jd.deviceNames, dev_ids)


interface CmdOptions {
    parseLog?: string;
    log?: string;
    all?: boolean;
    flash?: string;
    ignoreDevClass?: boolean;
}

async function main() {
    commander
        .version("0.0.0")
        .option("-p, --parse-log <logfile>", "parse log file from jdspy or Logic")
        .option("-l, --log <logfile>", "in addition to print, save data to file")
        .option("-a, --all", "print repeated commands")
        .option("-f, --flash <file.bin>", "flash binary file")
        .option("-D, --ignore-dev-class", "ignore device class when flashing")
        .parse(process.argv)
    const opts = commander as CmdOptions

    function processFrame(frame: jdpretty.ParsedFrame) {
        if (frame.info)
            console.warn("FRM: " + frame.info)
        for (let p of jd.Packet.fromFrame(frame.data, frame.timestamp)) {
            if (opts.log)
                fs.appendFileSync(opts.log, `JD ${frame.timestamp} ${U.toHex(frame.data)}\n`)
            jd.process(p)
            const pp = jdpretty.printPkt(p, {
                skipRepeatedAnnounce: !opts.all,
                skipRepeatedReading: !opts.all
            })
            if (pp)
                console.log(pp)
        }
    }

    if (opts.parseLog) {
        for (const frame of jdpretty.parseLog(fs.readFileSync(opts.parseLog, "utf8")))
            processFrame(frame)
        return
    }


    const startTime = Date.now()
    const hf2 = new HF2.Proto(new HF2.Transport())
    try {
        await hf2.init()

        jd.setSendPacketFn(p =>
            hf2.sendJDMessageAsync(p.toBuffer())
                .then(() => { }, err => console.log(err)))

        if (opts.flash) {
            await jdbl.flash(hf2, {
                program: fs.readFileSync(opts.flash),
                name: opts.flash,
                ignoreDevClass: opts.ignoreDevClass
            })
            await hf2.io.disconnectAsync()
            return
        }

        hf2.onJDMessage(buf => {
            processFrame({ data: buf, timestamp: Date.now() - startTime })
        })
    } catch (err) {
        console.error("ERROR: ", err)
        await hf2.io.disconnectAsync()
    }
}


main()
