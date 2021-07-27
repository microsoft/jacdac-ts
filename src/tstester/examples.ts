import { TestDriver } from "./base";
import { ServiceTester } from "./testwrappers";

// Overall concepts
// waits - until event (instant in time)
// - wait until (single event, with optional timeout)
//    -> retuns time, can fail suite (throw error, specific to failure type)
// - wait until (assert synchronous events, with tolerance, with optional timeout)
//    -> retuns time, can fail suite (throw error - specific to failure type)
// 
// events
// - register update
// - register condition (timed with update)
// - register edge
// - service event
//
// duration conditions - implemented as event hooks throughout some time - requireWhile({...}, conds...)
// - particular event does not fire
// - no event fires
// - register condition (all register updates must satisfy)
//
// write registers
//
// ask user for input

class ButtonTestRoutine {
    constructor(readonly service: ServiceTester, readonly driver: TestDriver) {

    }

    public testClick() {
        // User instruction: press and release button, within 500ms



        // check synchronous event: down event, register up-to-down, within some tolerance (100ms?)
            // test case errors if these are out of sync - with a special message
        // wait at most 500ms - until next - assert register remains down, assert no events
        // check synchronous event: up event, register down-to-up, within some tolerance (100ms?)

        // concepts
        // assert synchronous events
            // what happens on a non-synchronous event? concept of RequiredSynchronousEvent that fails the suite?
            // possible solutions: events that can fail, or assertWaitSynchronous(events...)
        // wait until event, with timing bounds and duration assertions (no events fire, register within / equal)
            // retuns time elapsed
    }

    public testHold() {
        // User instruction: press and hold the button

        // check synchronous event: down event, register up-to-down, within some tolerance (100ms?)
        // wait 500ms +/- 100 ms - until next - assert register remains down, assert no events
        // check event: hold generated - initial hold test
        // repeat 2-3 times - subsequent hold tests
    
        // User instruction: release button (to reset state for next test)

        // check synchronous event: up event, register down-to-up, within some tolerance (100ms?)
    }
}

class PotTestRoutine {
    public testLow() {
        // User instruction: set the pot to its lowest state, providing a live readout

        // wait for register to be about zero (some tolerance), stable for about a second
        // (optional) record for 1s, report on jitter and average

        // concepts
        // ask user a question - y/n might be fine
        // wait for some stability condition - with feedback to the user
        // assert some stability condition (duration assertions)
        // wait, while collecting some data (jitter, in this case)
    }

    public testHigh() {
        // same as low case, but high
    }

    public testMid() {
        // same as low case, but mid, perhaps with some mechanism so the user 
    }
}

class EncoderTestRoutine {
    // ideally with a nanoservices approach the button would re-use the button tests

    public testIncrement() {
        // duration assertion: register does not decrement

        // User instruction: turn clockwise one click

        // wait for register to increment

        // User instruction: turn clockwise for one full turn

        // wait for register to equal one full turn
        // make sure it doesn't overshoot
        // TODO how to make this recoverable if the user turns it too quickly?
        // ideas: release duration assertion after hitting a full turn
        //   but wait for value to stabilize

        // concepts
        // duration assertions
        // wait for some stability conditions
    }

    public testDecrement() {
        // inverted of decrement test
    }
}

class PixelRingTestRoutine {
    public testRgb() {
        // dynamically determine pixel length

        // sets the entire ring red
        // ask user if ring is red

        // repeat for green, blue
    }

    public testAllWhite() {
        // sets everything full blast

        // ask user if it's correct
    }

    public testFade() {
        // runs through a fade R-Y-G-C-B-P sequence
    }

    public testRotate() {
        // rotates LEDs with a R-Y-G-C-B-P sequence
    }
}
