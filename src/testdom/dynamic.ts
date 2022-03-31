import { addDynamicServiceTestFactory } from "./compiler"
import {
    SRV_GAMEPAD,
} from "../jdom/constants"

addDynamicServiceTestFactory(
    SRV_GAMEPAD,
    (deviceTest, serviceTest) => {
        // do we know the index of the associated service?
    }
)