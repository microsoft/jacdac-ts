var pot = roles.potentiometer()
var led = roles.lightBulb()
var p

if (false)
    every(0.5, () => {
        p = pot.position.read()
        print("tick {0}", p)
        led.brightness.write(2 * p)
    })

pot.position.onChange(0.02, () => {
    p = pot.position.read()
    print("tick {0}", p)
    led.brightness.write(2 * p)
})

every(0.2, () => {
    print("lb {0}", led.brightness.read())
})
