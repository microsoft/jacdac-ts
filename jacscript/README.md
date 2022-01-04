# JacScript

## Design goals for Jacscript VM

* secure - can predictably execute untrusted code (random bytes)
* easy to analyze - should be possible to statically determine the set of APIs used
* small memory (RAM) footprint
* small code (flash) footprint
* leave space for extensions in future

## JavaScript subset

Global variables are supported (no `const` or `let`).
Local variables are not supported yet (TODO).

All variables are numbers (64-bit IEEE floating point).
Numeric binary and unary expressions are supported.
Comparisons return `0.0` or `1.0` (in particular comparing anything to `NaN` returns `0.0`).
`0.0` and `NaN` are considered falsy.
TODO should compare with NaN return NaN?

```js
var x, y
x = pot.reading.read()
if (x < 0.3) {
    y = x * 3
} else {
    y = -x / 7
}
```

Some builtin functions only take literal arguments (especially strings, and time values).

The only jump statement supported is currently `return`. There are no loops.

## Logging and format strings

The `print()` function takes a literal string, and optionally format arguments.

```js
print("Hello world")
print("X is {0} and Y is {1}", x, y)
```

Arguments are `{0}`, `{1}`, ..., `{9}`, `{A}`, `{B}`, ..., `{F}`.
A second digit can be supplied to specify precision (though this doesn't work so well yet):

```js
print("X = {04}", x)
```

Some functions that take string literals also accept `format()` function, using the same formatting strings as `print()`,
for example:

```js
charDisplay.message.write(format("X is {0}", x))
```

## Roles

Roles are defined by referencing a service name (in `roles` namespace).
The same role can be referenced multiple times, and runtime makes sure not to assign
multiple roles to the same service instance (TODO implemented this).

```js
var btnA = roles.button()
var btnB = roles.button()
var pot = roles.potentiometer()
var lamp = roles.lightBulb()
```

## Events

Events are referenced as `myRole.eventName`. They currently have one member function, `.sub()`.

```js
btnA.down.sub(() => {
    print("button down!")
})
```

## Registers

Registers are referenced as `myRole.regName`, where `regName` can also be the system-wide name,
so both `pot.position` and `pot.reading` will work.

Registers have following methods - `.onChange()`, `.read()` and `.write()`.
If register contains multiple fields, a tuple (array) is returned.

```js
var x
x = pot.position.read()
x = pot.reading.read() // equivalent

lamp.brightness.write(0.7)

var r, g, b
[r, g, b] = colorSensor.color.read()

myLed.color.write(0.3, 1, 0.7)
```

The `.onChange()` handler can be registered to execute whenever the value of the register changes
by at least the specified value.
It is executed once when the value is first determined, and then whenever the current value
is different by at least the specified value from the value at previous handler execution.

```js
pot.position.onChange(0.02, () => {
    lamp.brightness.write(pot.position.read())
})
```

## Top-level functions

### Time

Run a function periodically (`0.3s` in the example below; `20ms` minimum):
```js
every(0.3, () => {
    // ...
})
```

Wait given number of seconds:
```js
wait(0.3)
```

### Cloud telemetry upload

Send a label + 0 or more numeric values.

```js
upload("potval", pot.reading.read())
upload("color", r * 256, g * 256, b * 256)
upload(format("X[{0}]", idx), x)
```

### Math

Arithmetic operators are supported: `+`, `-`, `*`, `/`, `**`, as well as unary `-` and `+`.

Comparison operators `<`, `<=`, `>`, `>=`, `==`, `===`, `!=`, `!==` are supported (and return doubles).

The operators `&&` and `||` are supported, but are **currently not lazy**.
The boolean negation `!` is supported (returning `0` or `1`).

The bitwise operators are not supported.

The following math functions and constants are supported:
* `Math.floor`
* `Math.round`
* `Math.ceil`
* `Math.log`
* `Math.random`
* `Math.max`
* `Math.min`
* `Math.pow`
* `Math.sqrt`
* `Math.cbrt`
* `Math.exp`
* `Math.log10`
* `Math.log2`
* `Math.E`
* `Math.PI`
* `Math.LN10`
* `Math.LN2`
* `Math.LOG2E`
* `Math.LOG10E`
* `Math.SQRT1_2`
* `Math.SQRT2`
* `isNaN`
* `NaN`

### Misc functions

The `panic()` function takes a numeric error code and terminates or restarts the program.
`reboot()` is similar, but doesn't print error message.

```js
panic(348)
reboot()
```

### User-defined functions

User-defined functions are allowed at the top-level, using `function foo(x, y) { ... }` syntax.
They are also allowed as event handlers using arrow syntax (see above).
Nested functions and real first-class functions are not supported.

Functions can return values.
A plain `return` is equivalent to `return NaN`.


## TODO

* change call to transfer regs to locals automatically?
* register reads may not be triggered enough for `onChange()` to work
* `role.isConnected()` or something; also `role.onConnected(() => { })`
* sending commands: `buzzer.play_note(freq, 0.9, time)`
* responding to cloud messages: `onCloud("play_sound", (freq, time) => { ... })`
* responding to twin updates: `onTwinUpdate("foo.bar", value => { ... })`; on boot as well
* auto-upload of everything
* specific uploads: `hum.autoUpload(5, 1) // 5s, 1%`
* role mgr
* implementing services in jacscript
* some testing framework? (depends on services?)
* more "debug" info in compiled program - role names, ?

### Debugger interface

* fiber list, locals, globals
* setting breakpoints - breakpoint instruction? (based on source code location)