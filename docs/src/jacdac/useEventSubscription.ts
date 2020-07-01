import { JDNode } from "../../../src/dom/eventemitter";
import { useState, useEffect } from "react";

function useEventSubscription<T>(eventEmitter: JDNode, eventName: string): T {
    const [value, setValue] = useState<T>(undefined)
    useEffect(() => eventEmitter.subscribe<T>(eventName, value => setValue(value))
        , [eventEmitter, eventName])
    return value;
}

export default useEventSubscription;