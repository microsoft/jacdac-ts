import { compile } from "./compiler"

const sample = `
var btnA = roles.button()
var color = roles.color()
var led = roles.lightBulb()
var display = roles.characterScreen()
var r, g, b, tint

btnA.down.sub(() => {
  led.brightness.write(1)
  wait(0.1);
  [r, g, b] = color.reading.read()
  tint = (r + g + 2.3 * b) / (r + 2 * g + b)
  upload("color", r, g, b, tint)
  display.message.write(format("t={0} {1}", tint, r))
  led.brightness.write(0)
})
`

function mainTest() {
    compile(
        {
            write: (fn, cont) =>
                require("fs").writeFileSync("dist/" + fn, cont),
        },
        sample
    )
}

mainTest()
