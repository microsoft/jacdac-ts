function identify(d: jacdac.Device) {
    if (!d) return
    if (d == jacdac.bus.selfDevice) {
        control.runInParallel(() => {
            jacdac.bus.emit(jacdac.IDENTIFY)
            jacdac.bus.emit(jacdac.STATUS_EVENT, jacdac.StatusEvent.Identify)
        })
    } else {
        d.sendCtrlCommand(jacdac.ControlCmd.Identify)
    }
}

function describe(dev: jacdac.Device) {
    let name = ""
    if (dev == jacdac.bus.selfDevice)
        name = "<self>"
    /*
else if (dns) {
    const bound = dns.remoteRequestedDevices.find(d => d.boundTo == dev)
    if (bound) name = "(" + bound.name + ")"
}
*/
    return `${dev.shortId} ${name}`
}

function selectDevice(fun: string, cond: (dev: jacdac.Device) => boolean) {
    let res: jacdac.Device = undefined
    let devs: jacdac.Device[]
    menu.show({
        title: "Function: " + fun,
        footer: "A = select, -> = identify",
        update: opts => {
            devs = jacdac.bus.devices.filter(cond)
            opts.elements = devs.map(d => menu.item(describe(d), opts => {
                res = d
                menu.exit(opts)
            }, () => identify(d)))
        }
    })
    return res
}

function resetAll() {
    jacdac.JDPacket.onlyHeader(jacdac.ControlCmd.Reset)
        .sendAsMultiCommand(jacdac.SRV_CONTROL)
}

let consoleClient: jacdac.LoggerClient

function showConsole() {
    game.pushScene() // black bg
    game.consoleOverlay.setVisible(true)
}

function hideConsole() {
    console.log("B to exit...")
    let done = false
    controller.B.onEvent(ControllerButtonEvent.Pressed, () => {
        done = true
    })
    pauseUntil(() => done)
    game.consoleOverlay.setVisible(false)
    game.popScene()
}

function startConsole() {
    if (!consoleClient) {
        consoleClient = new jacdac.LoggerClient()
        consoleClient.minPriority = jacdac.LoggerPriority.Debug
        consoleClient.start()
    }
    showConsole()
    hideConsole()
}

function wifi() {
    showConsole()

    //net.updateAccessPoint("SSID", "pass")

    console.log("WiFi starting...")
    net.logPriority = ConsolePriority.Log
    const n = net.instance()
    const cl = n.controller
    cl.connect()
    pauseUntil(() => cl.isConnected)
    console.log("connected; MAC:" + cl.MACaddress.toHex())

    const resp = net.get("https://pxt.io/api/ping")
    console.log("resp: " + resp.toString())
    console.log("cont: " + resp.content)


    hideConsole()
}

function deviceBrowser() {
    let devs: jacdac.Device[] = []
    menu.show({
        title: "JACDAC browser",
        footer: "A=view, > test, < ID",
        update: opts => {
            devs = jacdac.bus.devices.slice()
            devs.sort((a, b) => a.shortId.compare(b.shortId))
            opts.elements = devs.map(d => menu.item(describe(d), () => deviceView(d),
                () => testDevice(d), () => identify(d)))
        }
    })
}

interface FnMap {
    [index: string]: () => void;
}

function mainMenu() {
    menu.show({
        title: "JACDAC tool",
        update: opts => {
            // opts.elements = allDNSes().map(d => menu.item("DNS: " + describe(d), () => operateDNS(d)))
            opts.elements = []
            opts.elements.push(menu.item("Device browser", deviceBrowser))
            opts.elements.push(menu.item("WiFi", wifi))
            opts.elements.push(menu.item("Console", startConsole))
            opts.elements.push(menu.item("Reset all devices", resetAll))
        }
    })
}

function main() {
    menu.wait(1000, "Scanning...")
    mainMenu()
}

jacdac.start({ disableRoleManager: true })
control.runInBackground(main)
