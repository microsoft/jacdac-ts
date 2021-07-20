import { suite, test } from "mocha"
import { withTestBus } from "./tester"
import { assert } from "../../src/jdom/utils"
import { FastForwardScheduler } from "./scheduler"

suite("fast forward scheduler", () => {
    test("fires setTimeout", async function () {
        await withTestBus(async bus => {
            const ffScheduler = bus.scheduler as FastForwardScheduler

            let done = false
            ffScheduler.setTimeout(() => {done = true}, 500)
            await ffScheduler.runForDelay(501)
            assert(done)
        })
    })

    test("fires setInterval, repeatedly", async function () {
        await withTestBus(async bus => {
            const ffScheduler = bus.scheduler as FastForwardScheduler

            let count = 0
            ffScheduler.setInterval(() => {count += 1}, 100)
            await ffScheduler.runForDelay(501)
            assert(count == 5)
        })
    })

    test("clear setTimeout", async function () {
        await withTestBus(async bus => {
            const ffScheduler = bus.scheduler as FastForwardScheduler

            let called = false
            const handler = ffScheduler.setTimeout(() => {called = true}, 500)
            await ffScheduler.runForDelay(400)
            ffScheduler.clearTimeout(handler)
            await ffScheduler.runForDelay(101)
            assert(!called)
        })
    })

    test("clear setInterval", async function () {
        await withTestBus(async bus => {
            const ffScheduler = bus.scheduler as FastForwardScheduler

            let count = 0
            const handler = ffScheduler.setInterval(() => {count += 1}, 100)
            await ffScheduler.runForDelay(301)
            ffScheduler.clearInterval(handler)
            assert(count == 3)
        })
    })
})
