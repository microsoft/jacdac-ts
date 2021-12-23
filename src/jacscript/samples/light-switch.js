var btnA = roles.button()
var led = roles.lightBulb()

print("program start")
btnA.down.sub(() => {
  print('down event')
  led.brightness.write(1)
  wait(1);
  led.brightness.write(0)
})
print("program stop")
