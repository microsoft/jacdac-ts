import { JDNode } from "../../../src/dom/node";
import { useState, useEffect } from "react";

export default function useEvent<TNode extends JDNode, TValue>(eventName: string | string[], node: TNode, query?: (n: TNode) => TValue): TValue {
    const [version, setVersion] = useState(0)
    const value = query ? query(node) : undefined

    useEffect(() => node?.subscribe(eventName, () => {
        //console.log(`change ${node} ${version}->${node.changeId}`)
        setVersion(version + 1)
    }), [node, version])

    return value;
}
