function setup() {
    createCanvas(400, 400)
    connect = createButton("connect")
    connect.mousePressed(jacdac.connect)
}

function draw() {
    const { potentiometer } = jacdac.sensors
    const [r = 0, g = 0, b = 0] = potentiometer
    background(r * 255, g * 255, b * 255)
}
