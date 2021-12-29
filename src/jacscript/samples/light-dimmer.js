var pot = roles.potentiometer()
var led = roles.lightBulb()
var p

/*
every(0.5, () => {
  p = pot.reading.read()
  print("tick {0}", p)
  led.brightness.write(2 * p)
})
*/

pot.reading.onChange(0.02, () => {
  p = pot.reading.read()
  print("tick {0}", p)
  led.brightness.write(2 * p)
})
