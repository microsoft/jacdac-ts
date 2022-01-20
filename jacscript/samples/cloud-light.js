var led = roles.lightBulb()

cloud.onMethod("light", (v) => {
    led.brightness.write(v)
})
