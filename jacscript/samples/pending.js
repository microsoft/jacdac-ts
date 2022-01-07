var btnA = roles.button()
var led = roles.lightBulb()

btnA.down.sub(() => {
    print('down')
    led.brightness.write(1)
    wait(0.2)
    led.brightness.write(0.3)
    wait(1)
    led.brightness.write(0)
    print('end down')
})
