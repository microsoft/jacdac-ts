var cloud = roles.jacscriptCloud()

var q = 0

every(1, () => {
    print("upl {0}", q)
    cloud.upload("hello", q, 2 * q, q + 10000)
    q = q + 1
})
