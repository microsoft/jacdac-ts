import { Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@material-ui/core";
import React, { useContext } from "react"
import { NEW_LISTENER, REMOVE_LISTENER } from "../../../src/dom/constants";
import { JDNode, visitNodes } from "../../../src/dom/node";
import JACDACContext, { JDContextProps } from "../../../src/react/Context";
import useChange from "../jacdac/useChange"
import { PaperBox } from "./PaperBox";

function NodeCallRow(props: { node: JDNode }) {
    const { node } = props;
    const stats = node.eventStats;
    const events = Object.keys(stats)
        .sort((l, r) => -stats[l] + stats[r])
    const total = events.filter(ev => ev !== REMOVE_LISTENER && ev !== NEW_LISTENER)
        .map(ev => stats[ev])
        .reduce((prev, curr) => prev + curr, 0);

    return <>
        <TableHead>
            <TableRow>
                <TableCell valign="top">{node.id}</TableCell>
                <TableCell valign="top">{total}</TableCell>
            </TableRow>
        </TableHead>
        <TableBody>
            {events.map(ev => <TableRow key={ev}>
                <TableCell>{ev}</TableCell>
                <TableCell>{stats[ev]}</TableCell>
            </TableRow>)}
        </TableBody>
    </>
}

function NodeCalls() {
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const nodes: JDNode[] = [];
    visitNodes(bus, n => nodes.push(n))

    return <PaperBox key="slots">
        <TableContainer >
            <Table size="small">
                {nodes.map(node => <NodeCallRow key={node.id} node={node} />)}
            </Table>
        </TableContainer>
    </PaperBox>
}


function NodeListenerRow(props: { node: JDNode }) {
    const { node } = props;
    const eventNames = node.eventNames()
        .sort((l, r) => -node.listenerCount(l) + node.listenerCount(r))
    const counts = eventNames.map(ev => node.listenerCount(ev));
    const total = counts.reduce((p, c) => p + c, 0);

    const handleClick = (ev: string) => () => {
        const stackTraces = node.listenerStackTraces(ev)
        stackTraces.forEach(st => console.log(st));
    }

    return <>
        <TableHead>
            <TableRow>
                <TableCell valign="top">{node.id}</TableCell>
                <TableCell valign="top">{total}</TableCell>
                <TableCell />
            </TableRow>
        </TableHead>
        <TableBody>
            {eventNames.map((ev, i) => <TableRow key={ev}>
                <TableCell>
                    {ev}
                </TableCell>
                <TableCell>{counts[i]}</TableCell>
                <TableCell>
                    <Button size="small" onClick={handleClick(ev)}>traces</Button>
                </TableCell>
            </TableRow>)}
        </TableBody>
    </>
}

function NodeListeners() {
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const nodes: JDNode[] = [];
    visitNodes(bus, n => nodes.push(n))

    return <PaperBox key="slots">
        <TableContainer >
            <Table size="small">
                {nodes.map(node => <NodeListenerRow key={node.id} node={node} />)}
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
