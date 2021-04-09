import * as U from "./utils"
import Packet from "./packet"
import { JDDevice } from "./device"
import { PACKET_REPORT, CMD_GET_REG, JD_SERVICE_INDEX_CTRL } from "./constants"

const REG_CTRL_FIRMWARE_IDENTIFIER = 0x181

export async function packetSpeedTest(dev: JDDevice) {
    const pingCmd = CMD_GET_REG | REG_CTRL_FIRMWARE_IDENTIFIER

    dev.on(PACKET_REPORT, onPacket)
    const t0 = Date.now()
    let lastSend = Date.now()
    let numpkt = 0
    let timeouts = 0
    let numrecv = 0
    let done = false

    await ask()
    while (numpkt < 100) {
        await U.delay(50)
        const now = Date.now()
        if (now - t0 > 3000) break
        if (now - lastSend > 100) {
            timeouts++
            await ask()
        }
    }
    done = true
    await U.delay(250)
    dev.off(PACKET_REPORT, onPacket)
    const ms = Date.now() - t0

    const pktsPerSecond = numpkt / (ms / 1000)
    const dropRate = (100 * (numpkt - numrecv)) / numpkt

    return {
        msg: `${pktsPerSecond.toFixed(1)} pkts/s; ${dropRate.toFixed(
            2
        )}% dropped`,
        pktsPerSecond,
        dropRate,
    }

    async function ask() {
        lastSend = Date.now()
        numpkt++
        await dev.sendCtrlCommand(pingCmd)
    }

    async function onPacket(p: Packet) {
        if (
            p.serviceIndex == JD_SERVICE_INDEX_CTRL &&
            p.serviceCommand == pingCmd
        ) {
            numrecv++
            if (!done) await ask()
        }
    }
}
