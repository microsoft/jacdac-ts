import { JDNode } from "../../../src/dom/node";
import { CHANGE } from "../../../src/dom/constants";
import { useState, useEffect, useMemo, useContext } from "react";
import JacdacContext from "../../../src/react/Context";

function useChange<TNode extends JDNode, TValue>(node: TNode, query: (n: TNode) => TValue): TValue {
    const { bus } = useContext(JacdacContext)
    const [version, setVersion] = useState(0)
    const value = useMemo(() => query(node), [node, version, bus])

    useEffect(() => node.subscribe(CHANGE, () => {
        //console.log(`change ${node} ${version}`)
        setVersion(version + 1)
    }), [node, version])

    return value;
}

export default useChange;
