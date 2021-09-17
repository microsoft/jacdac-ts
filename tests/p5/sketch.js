let counter = 0
function setup() {
    createCanvas(400, 400)
    textAlign(CENTER, CENTER)
    textSize(64)

    // use jacdac.events to register events
    jacdac.events.button.down(() => counter ++)
}

function draw() {
    // grabs an array with all potentiometer readings (number[]) connected to jacdac
    const { potentiometer } = jacdac.sensors
    // destructure readings into r,g,b variables
    // if sensors are missing, default to 0
    const [r = 0, g = 0, b = 0] = potentiometer
    // rescale 0..1 to 0..255 to repaint background
    background(r * 255, g * 255, b * 255)

    // move points for an accelerometer
    const { accelerometer } = jacdac.sensors
    // the acceleration is stored as a ``{ x: .., y: ..., z: ... }`` object
    for(const acceleration of accelerometer) {
        const { x: ax = 0, y: ay = 0, z: az = 0 } = acceleration

        // map g (gravities) to 100..300 on canvas
        const x = map(ax, -1, 1, 100, 300)
        const y = map(ay, -1, 1, 100, 300)
        const d = map(az, -1, 1, 5, 50)
        stroke('white')
        circle(x, y, d)
    }

    // show button counter
    fill('white')
    text(counter, 200, 200)
}
