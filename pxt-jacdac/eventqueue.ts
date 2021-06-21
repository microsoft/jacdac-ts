//
// triplicate event queue
//
namespace jacdac {
    let delayedPackets: DelayedPacket[]

    class DelayedPacket {
        constructor(
            public readonly timestamp: number,
            public readonly pkt: JDPacket
        ) {}
    }

    export function delayedSend(pkt: JDPacket, timestamp: number) {
        if (!delayedPackets) {
            delayedPackets = []
            control.runInParallel(processDelayedPackets)
        }
        const dp = new DelayedPacket(timestamp, pkt)
        for (let i = 0; i < delayedPackets.length; ++i) {
            if (delayedPackets[i].timestamp > timestamp) {
                delayedPackets.insertAt(i, dp)
                return
            }
        }
        delayedPackets.push(dp)
    }

    function processDelayedPackets() {
        while (true) {
            pause(10)
            const now = control.millis()
            for (;;) {
                const curr = delayedPackets[0]
                if (!curr || curr.timestamp > now) break
                delayedPackets.shift()
                curr.pkt._sendCore()
            }
            if (!delayedPackets.length) {
                delayedPackets = null
                return
            }
        }
    }
}
