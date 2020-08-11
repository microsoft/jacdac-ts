import React, { useState, useEffect } from "react"
import { JDEvent } from "../../../src/dom/event"
import { CHANGE } from "../../../src/dom/constants"

export default function useEventCount(event: JDEvent) {
    const [count, setCount] = useState(event.count)
    useEffect(() => event.subscribe(CHANGE, () => {
        setCount(event.count)
    }))

    return count;
}