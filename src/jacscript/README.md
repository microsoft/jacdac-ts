# JacScript

## JavaScript subset

Global variables are supported (no `const` or `let`).
Local variables are not supported yet (TODO).

All variables are numbers (64-bit IEEE floating point).
Numeric binary and unary expressions are supported.
Comparisons return `0.0` or `1.0`.

```js
var x, y
x = pot.reading.read()
y = x * 3
```

Some builtin functions only take literal arguments (especially strings, and time values).

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

Registers currently have two methods - `.read()` and `.write()`.
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
