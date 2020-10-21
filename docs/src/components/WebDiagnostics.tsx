import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@material-ui/core";
import React, { useContext } from "react"
import { NEW_LISTENER, REMOVE_LISTENER } from "../../../src/dom/constants";
import { JDNode, visitNodes } from "../../../src/dom/node";
import JACDACContext, { JDContextProps } from "../../../src/react/Context";
import useChange from "../jacdac/useChange"
import { PaperBox } from "./PaperBox";

function NodeCallRow(props: { node: JDNode }) {
    const { node } = props;
    const stats = node.eventStats;
    const events = Object.keys(stats);
    const statsText = events
        .sort((l, r) => -stats[l] + stats[r])
        .map(k => `${k}=${stats[k]}`)
        .join(", ")
    const total = events.filter(ev => ev !== REMOVE_LISTENER && ev !== NEW_LISTENER)
        .map(ev => stats[ev])
        .reduce((prev, curr) => prev + curr);

    return <TableRow>
        <TableCell>{node.id}</TableCell>
        <TableCell>{total}</TableCell>
        <TableCell>{statsText}</TableCell>
    </TableRow>
}

function NodeCalls() {
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const nodes: JDNode[] = [];
    visitNodes(bus, n => nodes.push(n))

    return <PaperBox key="slots">
        <TableContainer >
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell >id</TableCell>
                        <TableCell>total</TableCell>
                        <TableCell>events</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {nodes.map(node => <NodeCallRow key={node.id} node={node} />)}
                </TableBody>
            </Table>
        </TableContainer>
    </PaperBox>
}


function NodeListenerRow(props: { node: JDNode }) {
    const { node } = props;
    const eventNames = node.eventNames()
        .sort((l, r) => -node.listenerCount(l) + node.listenerCount(r))
    const counts = eventNames.map(ev => node.listenerCount(ev));
    const total = counts.reduce((p, c) => p + c);
    const statsText = eventNames.map((ev, i) => `${ev}=${counts[i]}`).join(", ");

    return <TableRow>
        <TableCell>{node.id}</TableCell>
        <TableCell>{total}</TableCell>
        <TableCell>{statsText}</TableCell>
    </TableRow>
}

function NodeListeners() {
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const nodes: JDNode[] = [];
    visitNodes(bus, n => nodes.push(n))

    return <PaperBox key="slots">
        <TableContainer >
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell >id</TableCell>
                        <TableCell>total</TableCell>
                        <TableCell>events</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {nodes.map(node => <NodeListenerRow key={node.id} node={node} />)}
                </TableBody>
            </Table>
        </TableContainer>
    </PaperBox>
}

export default function WebDiagnostics() {
    return <PaperBox>
        <h3>Diagnostics</h3>
        <p>This diagnostics view does not register events to refresh automatically.
        </p>
        <h4>Event Listeners</h4>
        <NodeListeners />
        <h4>Event Calls</h4>
        <NodeCalls />
    </PaperBox>
}
