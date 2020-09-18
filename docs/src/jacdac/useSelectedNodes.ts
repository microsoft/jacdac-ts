import React, { useState } from "react"
import { JDNode } from "../../../src/dom/node"

export default function useSelectedNodes<TNode extends JDNode>() {
    const [nodes] = useState<Set<string>>(new Set<string>())
    const [size, setSize] = useState(0)

    const selected = (node: TNode) => nodes.has(node?.id)
    const setSelected = (node: TNode, value: boolean) => {
        if (!node) return;
        const s = selected(node)
        if (!!value !== s) {
            if (!value)
                nodes.delete(node.id)
            else
                nodes.add(node.id)
            setSize(nodes.size)
        }
    }
    return {
        allSelected: nodes,
        hasSelection: size > 0,
        selected,
        setSelected,
        toggleSelected: (node: TNode) => {
            setSelected(node, !selected(node))
        },
        clear: () => {
            nodes.clear()
            setSize(0)
        }
    }
}