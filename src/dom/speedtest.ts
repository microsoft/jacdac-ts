import * as U from "./utils"
import { Bus } from "./bus"
import { Packet } from "./packet"
import { Device } from "./device"
import { PACKET_REPORT, CMD_GET_REG, PACKET_RECEIVE } from "./constants"

const REG_CTRL_DEVICE_CLASS = 0x181

export async function packetSpeedTest(dev: Device) {
    const pingCmd = CMD_GET_REG | REG_CTRL_DEVICE_CLASS

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
        if (now - t0 > 3000)
            break
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
    const dropRate = 100 * (numpkt - numrecv) / numpkt

    return {
        msg: `${pktsPerSecond.toFixed(1)} pkts/s; ${dropRate.toFixed(2)}% dropped`,
        pktsPerSecond,
        dropRate,
    }

    async function ask() {
        lastSend = Date.now()
        numpkt++
        await dev.sendCtrlCommand(pingCmd)
    }

    async function onPacket(p: Packet) {
        if (p.service_number == 0 && p.service_command == pingCmd) {
            numrecv++
            if (!done)
                await ask()
        }
    }
}
