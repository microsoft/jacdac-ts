function setup() {
    createCanvas(400, 400)
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
