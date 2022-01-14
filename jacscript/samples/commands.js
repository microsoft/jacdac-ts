var anled = roles.led()
var btnA = roles.button()

btnA.down.sub(() => {
    anled.animate(255, 0, 255, 50)
    wait(1)
    anled.animate(255, 255, 0, 50)
    wait(1)
    anled.animate(0, 0, 0, 50)
})
