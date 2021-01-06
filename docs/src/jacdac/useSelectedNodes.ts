import React, { useRef, useState } from "react"
import { JDNode } from "../../../src/jdom/node"

export default function useSelectedNodes<TNode extends JDNode>() {
    const nodes = useRef<Set<string>>(new Set<string>())
    const [size, setSize] = useState(0)

    const selected = (node: TNode) => nodes.current.has(node?.id)
    const setSelected = (node: TNode, value: boolean) => {
        if (!node) return;
        const s = selected(node)
        if (!!value !== s) {
            if (!value)
                nodes.current.delete(node.id)
            else
                nodes.current.add(node.id)
            setSize(nodes.current.size)
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
            nodes.current.clear()
            setSize(0)
        }
    }
}