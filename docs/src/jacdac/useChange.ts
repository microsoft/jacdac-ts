import { EventEmitter } from "../../../src/dom/eventemitter";
import { CHANGE } from "../../../src/dom/constants";
import { useState, useEffect } from "react";

function useChange(eventEmitter: EventEmitter): void {
    const [value, setValue] = useState(0)
    useEffect(() => eventEmitter.subscribe(CHANGE, () => {
        console.log(`eventemitter ${value}`)
        setValue(value + 1)
    }), [eventEmitter])
}

export default useChange;
