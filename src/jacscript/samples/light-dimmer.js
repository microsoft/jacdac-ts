var pot = roles.potentiometer()
var led = roles.lightBulb()
var p

every(0.5, () => {
  p = pot.reading.read()
  print("tick {0}", p)
  led.brightness.write(p)
})
