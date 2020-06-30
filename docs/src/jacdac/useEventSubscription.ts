import { EventEmitter } from "../../../src/dom/eventemitter";
import { useState, useEffect } from "react";

export function useEventSubscription<T>(eventEmitter: EventEmitter, eventName: string): T {
    const [value, setValue] = useState<T>(undefined)
    useEffect(() => eventEmitter.subscribe<T>(eventName, value => setValue(value))
        , [eventEmitter, eventName])
    return value;
}
