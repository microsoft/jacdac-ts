/**
 * @param {number} x
 * @param {number} y
 */
function isClose(x, y) {
    print("{0} == {1}?", x, y)
    if (isNaN(x) && isNaN(y))
        return
    var d = Math.abs(x - y)
    if (d < 0.00000001 || d / Math.abs(x + y) < 0.00001)
        return
    panic(108)
}

function testMath() {
    isClose(2 + 2, 4)
    isClose(2 - 1, 1)
    isClose(3 * 4 + 3, 15.00001)
    isClose(Math.abs(10), 10)
    isClose(Math.abs(-10), 10)
    isClose(Math.abs(0), 0)
    isClose(Math.log(Math.E), 1)
    isClose(Math.log(1.23456), 0.21071463)
    isClose(Math.log(-1), NaN)
    isClose(0 / 0, NaN)
    isClose(Math.log2(Math.PI), 1.651496129)
    isClose(Math.log10(Math.PI), 0.49714987269)
    isClose(Math.pow(2, 0.5), Math.SQRT2)
    isClose(Math.sqrt(1 / 2), Math.SQRT1_2)
}

testMath()
print("all OK")
panic(1)
