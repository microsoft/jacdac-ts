var btnA = roles.button()
var led = roles.lightBulb()

print("program start")
btnA.down.sub(() => {
    print('down')
    led.brightness.write(!led.brightness.read())
    //wait(1);
    //led.brightness.write(0)
})
print("program stop")
