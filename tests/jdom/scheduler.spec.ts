import { suite, test } from "mocha"
import { assert } from "../../src/jdom/utils"
import { FastForwardScheduler } from "./scheduler"
import { makeTest } from "./fastforwardtester"

suite("fast forward scheduler", () => {
    test(
        "fires setTimeout",
        makeTest(async tester => {
            let done = false
            tester.bus.scheduler.setTimeout(() => {
                done = true
            }, 500)
            await tester.waitForDelay(501)
            assert(done)
        }),
    )

    test(
        "fires setInterval, repeatedly",
        makeTest(async tester => {
            let count = 0
            tester.bus.scheduler.setInterval(() => {
                count += 1
            }, 100)
            await tester.waitForDelay(501)
            assert(count == 5)
        }),
    )

    test(
        "clear setTimeout",
        makeTest(async tester => {
            let called = false
            const handler = tester.bus.scheduler.setTimeout(() => {
                called = true
            }, 500)
            await tester.waitForDelay(400)
            tester.bus.scheduler.clearTimeout(handler)
            await tester.waitForDelay(101)
            assert(!called)
        }),
    )

    test(
        "clear setInterval",
        makeTest(async tester => {
            assert(tester.bus.scheduler instanceof FastForwardScheduler)

            let count = 0
            const handler = tester.bus.scheduler.setInterval(() => {
                count += 1
            }, 100)
            await tester.waitForDelay(301)
            tester.bus.scheduler.clearInterval(handler)
            assert(count == 3)
        }),
    )

    test(
        "fires concurrent setTimeout, with waitForDelay",
        makeTest(async tester => {
            let finished1: number
            let finished2: number
            tester.bus.scheduler.setTimeout(() => {
                finished1 = tester.bus.timestamp
            }, 400)
            tester.bus.scheduler.setTimeout(() => {
                finished2 = tester.bus.timestamp
            }, 500)
            await tester.waitForDelay(501)
            assert(finished1 == 400)
            assert(finished2 == 500)
        }),
    )
})
