var pot = roles.potentiometer()
var led = roles.lightBulb()
var relay = roles.relay()
var p

pot.position.onChange(0.02, () => {
    p = pot.position.read()
    print("tick {0}", p)
    led.brightness.write(p)
})

led.brightness.onChange(0.1, () => {
    relay.active.write(!relay.active.read())
})

every(0.2, () => {
    print("lb {0}", led.brightness.read())
})
