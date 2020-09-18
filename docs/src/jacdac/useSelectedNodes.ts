import React, { useState } from "react"
import { JDNode } from "../../../src/dom/node"

export default function useSelectedNodes<TNode extends JDNode>() {
    const [nodes, setNodes] = useState<Set<string>>(new Set<string>())

    const selected = (node: TNode) => nodes.has(node?.id)
    const setSelected = (node: TNode, value: boolean) => {
        if (!node) return;
        const s = selected(node)
        if (!!value !== s) {
            const n = new Set<string>(nodes)
            if (!value)
                n.delete(node.id)
            else
                n.add(node.id)
            setNodes(n)
        }
    }
    return {
        selected,
        setSelected,
        toggleSelected: (node: TNode) => {
            setSelected(node, !selected(node))
        },
        clear: () => setNodes(new Set<string>())
    }
}