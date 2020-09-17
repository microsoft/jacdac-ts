import { JDNode } from "../../../src/dom/node";
import { CHANGE } from "../../../src/dom/constants";
import { useState, useEffect } from "react";
import { JDEventSource } from "../../../src/dom/eventsource";

export default function useChange<TNode extends JDEventSource, TValue>(node: TNode, query?: (n: TNode) => TValue): TValue {
    const [version, setVersion] = useState(node?.changeId || 0)
    const value = query ? query(node) : undefined

    useEffect(() => node?.subscribe(CHANGE, () => {
        //console.log(`change ${node} ${version}->${node.changeId}`)
        setVersion(node.changeId)
    }), [node, version])

    return value;
}
