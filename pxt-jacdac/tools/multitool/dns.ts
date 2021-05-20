let dns: jacdac.RoleManagerClient

function describe(dev: jacdac.Device) {
    let name = ""
    if (dev == jacdac.selfDevice())
        name = "<self>"
    else if (dns) {
        const bound = dns.remoteRequestedDevices.find(d => d.boundTo == dev)
        if (bound) name = "(" + bound.name + ")"
    }
    return `${dev.shortId} ${name}`
}

function describeRemote(dev: jacdac.RemoteRequestedDevice) {
    let bnd = dev.boundTo ? dev.boundTo.shortId : ""
    const n = dev.candidates.filter(c => c != dev.boundTo).length
    if (n) {
        if (bnd) bnd += "+" + n
        else bnd = "" + n
    }
    if (bnd) bnd = "(" + bnd + ")"
    return `${dev.name} ${bnd}`
}

function operateDNS(ourDNS: jacdac.Device) {
    dns = new jacdac.RoleManagerClient(ourDNS.deviceId);
    dns.scan()

    menu.show({
        title: "Bind function",
        update: opts => {
            opts.elements = dns.remoteRequestedDevices
                .filter(r => r.name && r.name[0] != ".")
                .map(r =>
                    menu.item(describeRemote(r), () => {
                        const newD = selectDevice(r.name, d => r.isCandidate(d))
                        r.select(newD)
                    }))
            opts.elements.push(menu.item("Clear all names", () => {
                dns.clearNames()
                resetAll() // and reset everyone, just in case
            }))
        }
    })
}

function allDNSes() {
    return jacdac.devices().filter(hasDNS)
    function hasDNS(d: jacdac.Device) {
        return d.hasService(jacdac.SRV_ROLE_MANAGER)
    }
}

