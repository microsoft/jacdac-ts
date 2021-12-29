var temp = roles.temperature()
var heater = roles.relay()
var t

temp.reading.onChange(5, () => {
    t = temp.reading.read()
    if (t < 21) {
        heater.closed.write(1)
    } else {
        heater.closed.write(0)
    }
})
