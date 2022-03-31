import { addDynamicServiceTestFactory } from "./compiler"
import {
    SRV_GAMEPAD,
    GamepadEvent
} from "../jdom/constants"
import { EventTest } from "./nodes"
import { TestState } from "./spec"

addDynamicServiceTestFactory(
    SRV_GAMEPAD,
    (serviceTest) => {
        if (serviceTest.children?.length === 0) {
            serviceTest.appendChild(
                new EventTest(
                    "handle Up",
                    GamepadEvent.ButtonsChanged,
                    (node, logger) => {
                        return TestState.Fail
                    }
                )
            )
        }
    }
)