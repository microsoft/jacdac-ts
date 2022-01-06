var r1 = roles.noSuchService() //! no such service
var r2 = roles.button(1) //! 0 arguments required

var btn = roles.button()
var clr = roles.color()
function test1() {
    var a, b, c, d

    [a, b] = btn.pressure.read(); //! expecting a multi-field
    [a] = btn.pressure.read(); //! expecting a multi-field

    [a, b] = clr.color.read(); // OK
    [a, b, c, d] = clr.color.read() //! not enough fields in color

    a = clr.color.read() //! number required here

    a[b] = btn.pressure.read() //! unhandled assignment

    if (false)
        a[b] = btn.pressure.read() // OK - if false
}