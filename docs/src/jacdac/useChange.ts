import { JDNode } from "../../../src/dom/node";
import { CHANGE } from "../../../src/dom/constants";
import { useState, useEffect } from "react";
import { JDEventSource } from "../../../src/dom/eventsource";
import useEffectAsync from "../components/useEffectAsync";

export default function useChange<TNode extends JDEventSource, TValue>(node: TNode, query?: (n: TNode) => TValue): TValue {
    const [version, setVersion] = useState(node?.changeId || 0)
    const value = query ? query(node) : undefined

    useEffect(() => node?.subscribe(CHANGE, () => {
        //console.log(`change ${node} ${version}->${node.changeId}`)
        setVersion(node.changeId)
    }), [node, version])

    return value;
}

export function useChangeAsync<TNode extends JDEventSource, TValue>(node: TNode, query?: (n: TNode) => Promise<TValue>): TValue {
    const [version, setVersion] = useState(node?.changeId || 0)
    const [value, setValue] = useState(undefined);

    useEffect(() => node?.subscribe(CHANGE, () => {
        setVersion(node.changeId)
    }), [node, version])

    useEffectAsync(async (mounted) => {
        const valuePromise = query ? query(node) : undefined
        if (!valuePromise) {
            if (mounted())
                setValue(undefined)
        }
        else {
            const d = await valuePromise;
            if (mounted())
                setValue(d)
        }
    }, [node, version]);

    return value;
}
