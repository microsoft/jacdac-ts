function setup() {
  createCanvas(400, 400);

  connect = createButton("connect")
  connect.mousePressed(jacdac.connect)
}

function draw() {
  background(130);
  const { button } = jacdac.sensors
  console.log(button)
}
