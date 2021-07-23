import { createUSBBus } from "../jdom/jacdac-jdom"

class ConsoleUi {
    readonly logDiv: HTMLElement
    constructor(protected readonly document: Document) {
        this.logDiv = document.getElementById("log")

    }

    public log(msg: string) {  // TS reimplementation of console from packets.html
        const line = this.document.createElement("div")
        line.innerText = "" + msg
        line.style.whiteSpace = "pre-wrap"
        this.logDiv.appendChild(line)
        while (this.logDiv.childElementCount > 100) {
            this.logDiv.firstChild.remove()
        }
    }
}

export function main(document: Document) {
    const bus = createUSBBus()
    const ui = new ConsoleUi(document)

    document.getElementById("connect").onclick = async () => {
        ui.log("disconnecting ...")
        await bus.disconnect();
        ui.log("connecting ...")
        await bus.connect();
        ui.log("connected")
    }

    document.getElementById("disconnect").onclick = async () => {
        ui.log("disconnecting ...")
        await bus.disconnect()
        ui.log("disconnected")
    }
}
