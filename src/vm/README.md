# Jacdac DSL

The Jacdac domain-specific language (JdDSL) is a simple reactive language that 
is supported by the Jacdac Virtual Machine (JdVM). A JdDSL program is represented
by the VMProgram interface found in file `ir.ts`. A program has:
- a set of (client) roles, each having a type of Jacdac service
- a set of server roles, each also having a type of Jacdac service
- a set of handlers, each consisting of straight-line code (no loops for now)
- a set of global variables 

Currently, JdDSL does not support user-defined loops, functions, or data structures.

# Handlers

Each handler begins with a 


# Implementation

## Design goals for VM

* secure - can predictably execute untrusted code
* easy to analyze - should be possible to statically determine the set of APIs used
* small memory (RAM) footprint
* small code (flash) footprint
* leave space for extensions in future

## Runtime implementation notes

Sections:
* header
* float constant table
* int constant table
* string constant table
* code, split into per-function sections

Execution model:
* 16 registers
* global packet payload buffer `buf`
* all values are floats (doubles?)
* all registers are lost on function calls and context switch (instructions that wait)
* registers used for function calls and some opcodes (eg. printf())

Instructions:
* 32 bit

Programs declares:
* number of global variables
* set of role definitions (name + service class)
 
Instructions:
```
clear_buf(size)                      // sets size and clears
set_buf(offset, format, value)       // format is number encoding of things like u22.10
value := get_buf(offset, format)
get_reg(role, code, refresh_ms)      // stores in buf
set_reg(role, code)                  // value from buf
send_cmd(role, code)                 // payload from buf
r := arith(op, v0, v1)               // op is +, -, * etc
```

## Examples

```js
var btnA = role(services.button)
var color = role(services.color)
var led = role(services.pixel)
var r, g, b, tint

btnA.down.event(() => {
  color.enabled = true
  led.color = 0x00ff00
  wait(0.3)
  [r, g, b] = color.reading
  tint = (r + g + 2 * b) / log(r + g + b)
  upload("color", r, g, b, tint)
  display.text = format("t={0} {1}", tint, r)
  led.color = 0
  color.enabled = false
})
```

```js
var temp = role(services.thermometer)
var heat = role(services.relay)

temp.reading.onChange(1.5, () => {
  if (temp.reading > 20) {
    heat.enabled = false
  } else {
    heat.enabled = true
  }
  upload("heater", relay.enabled, temp.reading)
})
```

```js
every(0.5, () => {
  // ...
})
```

```js
var buzzer = role(services.buzzer)
onCloud("play_sound", (freq, time) => {
  buzzer.play_note(freq, 0.9, time)
})
```

```js
// run them on boot as well
onTwinUpdate("foo.bar", value => {
  // ...
})
```

```js
// Disable global auto-upload of all sensors:
autoUpload(false)
```

```js
var temp = role(services.thermometer)
var hum = role(services.humidity)
temp.autoUpload(5) // 5s
hum.autoUpload(5, 1) // 5s, 1%
```

