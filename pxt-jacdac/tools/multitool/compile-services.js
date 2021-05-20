const fs = require("fs")

// usage: node compile-services.js ../jacdac-docs/jacdac-ts/jacdac-spec/dist/services.json

const serv = JSON.parse(fs.readFileSync(process.argv[2], "utf8"))
let r = []
serv.forEach(s => {
    const id = Buffer.alloc(4)
    id.writeUInt32LE(s.classIdentifier)
    if (0x1fffff00 <= s.classIdentifier && s.classIdentifier <= 0x20000000)
        return
    console.log(id.toString("hex"), s.shortName)
    r.push(
        id,
        Buffer.from(s.shortName + "\u0000", "utf8")
    )
})
console.log(Buffer.concat(r).toString('hex').replace(/.{80}/g, f => f + "\n"))
