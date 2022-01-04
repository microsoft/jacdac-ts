var thermometer = roles.temperature()
var heater = roles.relay()
var t

thermometer.temperature.onChange(5, () => {
    t = thermometer.temperature.read()
    if (t < 21) {
        heater.closed.write(1)
    } else {
        heater.closed.write(0)
    }
})
