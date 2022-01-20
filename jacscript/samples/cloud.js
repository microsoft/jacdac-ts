var q = 0

every(10, () => {
    print("upl {0}", q)
    cloud.upload("hello", q, 2 * q, q + 10000)
    q = q + 1
})

cloud.onMethod("foo", (a, b) => {
    print("a={0} b={1}", a, b)
    return [a + 1, b * 2]
})
