import { ButtonEvent, ButtonReg } from "../jdom/constants"
import { TestDriver } from "./base"
import { ServiceTester } from "./servicewrapper"

export class PotTestRoutine {
    public async testLow() {
        // User instruction: set the pot to its lowest state, providing a live readout
        // wait for register to be about zero (some tolerance), stable for about a second
        // (optional) record for 1s, report on jitter and average
        // concepts
        // ask user a question - y/n might be fine
        // wait for some stability condition - with feedback to the user
        // assert some stability condition (duration assertions)
        // wait, while collecting some data (jitter, in this case)
    }

    public async testHigh() {
        // same as low case, but high
    }

    public async testMid() {
        // same as low case, but mid, perhaps with some mechanism so the user
    }
}

export class EncoderTestRoutine {
    // ideally with a nanoservices approach the button would re-use the button tests

    public async testIncrement() {
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

    public async testDecrement() {
        // inverted of decrement test
    }
}

export class PixelRingTestRoutine {
    public async testRgb() {
        // dynamically determine pixel length
        // sets the entire ring red
        // ask user if ring is red
        // repeat for green, blue
    }

    public async testAllWhite() {
        // sets everything full blast
        // ask user if it's correct
    }

    public async testFade() {
        // runs through a fade R-Y-G-C-B-P sequence
    }

    public async testRotate() {
        // rotates LEDs with a R-Y-G-C-B-P sequence
    }
}
