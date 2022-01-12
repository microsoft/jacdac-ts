var thermometer = roles.temperature()
var heater = roles.relay()
var t

heater.onConnected(() => {
    print("heater detected")
})

heater.onDisconnected(() => {
    print("heater lost")
})

thermometer.temperature.onChange(5, () => {
    t = thermometer.temperature.read()
    if (t < 21) {
        heater.active.write(1)
    } else {
        heater.active.write(0)
    }
})
