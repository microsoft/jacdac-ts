function setup() {
    createCanvas(400, 400)
    // connection to a USB/serial device must be initiated by the user (button click)
    connect = createButton("connect")
    connect.mousePressed(jacdac.connect)
}

function draw() {
    // grabs an array with all potentiometer readings (number[]) connected to jacdac
    const { potentiometer } = jacdac.sensors
    // destructure readings into r,g,b variables
    const [r = 0, g = 0, b = 0] = potentiometer
    // rescale 0..1 to 0..255 to repaint background
    background(r * 255, g * 255, b * 255)
}
