function setup() {
    createCanvas(400, 400)
    // connection to a USB/serial device must be initiated by the user (button click)
    // the browser remembers the connection and it should automatically
    // reconnect when refreshing the page
    connect = createButton("connect")
    connect.mousePressed(jacdac.connect)
}

function draw() {
    // grabs an array with all potentiometer readings (number[]) connected to jacdac
    const { potentiometer } = jacdac.sensors
    // destructure readings into r,g,b variables
    // if sensors are missing, default to 0
    const [r = 0, g = 0, b = 0] = potentiometer
    // rescale 0..1 to 0..255 to repaint background
    background(r * 255, g * 255, b * 255)
}
