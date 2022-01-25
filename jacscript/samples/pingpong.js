var condA = condition()
var condB = condition()
var btnA = roles.button()

every(0.05, () => {
    print("X2")
    condB.wait()
    print("sig 2")
})

every(0.05, () => {
    print("X1")
    condA.wait()
    print("sig 1")
    wait(1)
    condB.signal()
    wait(1)
})

btnA.down.subscribe(() => {
    print("down")
    condA.signal()
})
