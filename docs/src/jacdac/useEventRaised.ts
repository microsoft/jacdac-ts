import { JDNode } from "../../../src/dom/node";
import { useState, useEffect } from "react";

export default function useEventRaised<TNode extends JDNode, TValue>(eventName: string | string[], node: TNode, query?: (n: TNode) => TValue): TValue {
    const [version, setVersion] = useState(0)
    const value = query ? query(node) : undefined

    useEffect(() => node?.subscribe(eventName, () => {
        setVersion(version + 1)
    }), [node, version])

    return value;
}
