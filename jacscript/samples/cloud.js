var q = 0

if (false)
    every(10, () => {
        print("upl {0}", q)
        cloud.upload("hello", q, 2 * q, q + 10000)
        q = q + 1
    })

cloud.onTwinChange(() => {
    print("foo={0}", cloud.twin("foo"))
    print("bar.baz={0}", cloud.twin("bar.baz"))
    print("qux={0}", cloud.twin("qux"))
})

cloud.onMethod("foo", (a, b) => {
    print("foo a={0} b={1}", a, b)
    return [a + 1, b * 2]
})

cloud.onMethod("bar", (a) => {
    print("bar a={0}", a)
    wait(5)
    return [108]
})
