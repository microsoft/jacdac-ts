import { suite, test } from "mocha"
import { runForDelay, withTestBus } from "./tester"
import { assert } from "../../src/jdom/utils"
import { FastForwardScheduler } from "./scheduler"

suite("fast forward scheduler", () => {
    test("fires setTimeout", async function () {
        await withTestBus(async bus => {
            assert(bus.scheduler instanceof FastForwardScheduler)

            let done = false
            bus.scheduler.setTimeout(() => {
                done = true
            }, 500)
            await runForDelay(bus, 501)
            assert(done)
        })
    })

    test("fires setInterval, repeatedly", async function () {
        await withTestBus(async bus => {
            assert(bus.scheduler instanceof FastForwardScheduler)

            let count = 0
            bus.scheduler.setInterval(() => {
                count += 1
            }, 100)
            await runForDelay(bus, 501)
            assert(count == 5)
        })
    })

    test("clear setTimeout", async function () {
        await withTestBus(async bus => {
            assert(bus.scheduler instanceof FastForwardScheduler)

            let called = false
            const handler = bus.scheduler.setTimeout(() => {
                called = true
            }, 500)
            await runForDelay(bus, 400)
            bus.scheduler.clearTimeout(handler)
            await runForDelay(bus, 101)
            assert(!called)
        })
    })

    test("clear setInterval", async function () {
        await withTestBus(async bus => {
            assert(bus.scheduler instanceof FastForwardScheduler)

            let count = 0
            const handler = bus.scheduler.setInterval(() => {
                count += 1
            }, 100)
            await runForDelay(bus, 301)
            bus.scheduler.clearInterval(handler)
            assert(count == 3)
        })
    })
})
