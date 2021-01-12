import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Grid, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@material-ui/core";
import React, { useContext, useState } from "react"
import { NEW_LISTENER, REMOVE_LISTENER } from "../../../src/jdom/constants";
import { JDNode, visitNodes } from "../../../src/jdom/node";
import JACDACContext, { JDContextProps } from "../../../src/react/Context";
import PaperBox from "./ui/PaperBox";
// tslint:disable-next-line: match-default-export-name no-submodule-imports
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
// tslint:disable-next-line: match-default-export-name no-submodule-imports
import AddIcon from '@material-ui/icons/Add';
import { MenuItem } from '@material-ui/core';
import Alert from "./ui/Alert"
import { AlertTitle } from "@material-ui/lab";
import SelectWithLabel from "./ui/SelectWithLabel";
import IconButtonWithTooltip from "./ui/IconButtonWithTooltip";
import ButtonServiceHost from "../../../src/hosts/buttonservicehost";
import JDDeviceHost from "../../../src/jdom/devicehost";

function NodeCallRow(props: { node: JDNode }) {
    const { node } = props;
    const emitStats = node.eventStats;
    const newListenerStats = node.newListenerStats || {};
    const events = Object.keys(emitStats)
        .filter(ev => emitStats[ev] || newListenerStats[ev])
        .sort((l, r) => -emitStats[l] + emitStats[r])
    const emitTotal = events
        .filter(ev => ev !== REMOVE_LISTENER && ev !== NEW_LISTENER)
        .map(ev => emitStats[ev] | 0)
        .reduce((prev, curr) => prev + curr, 0);
    const newListenerTotal = events
        .map(ev => newListenerStats[ev] | 0)
        .reduce((prev, curr) => prev + curr, 0);

    if (emitTotal == 0)
        return null

    return <>
        <TableHead>
            <TableRow>
                <TableCell>{node.id}</TableCell>
                <TableCell>{emitTotal}</TableCell>
                <TableCell>{newListenerTotal}</TableCell>
            </TableRow>
        </TableHead>
        <TableBody>
            {events.map(ev => <TableRow key={ev}>
                <TableCell>{ev}</TableCell>
                <TableCell>{emitStats[ev] || 0}</TableCell>
                <TableCell>{newListenerStats[ev] || 0}</TableCell>
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
                <TableHead>
                    <TableRow>
                        <TableCell>node</TableCell>
                        <TableCell>calls</TableCell>
                        <TableCell>new listener</TableCell>
                    </TableRow>
                </TableHead>
                {nodes.map(node => <NodeCallRow key={node.id} node={node} />)}
            </Table>
        </TableContainer>
    </PaperBox>
}


function NodeListenerRow(props: { node: JDNode }) {
    const { node } = props;
    const eventNames = node.eventNames()
        .filter(ev => node.listenerCount(ev))
        .sort((l, r) => -node.listenerCount(l) + node.listenerCount(r))
    const counts = eventNames.map(ev => node.listenerCount(ev));
    const total = counts.reduce((p, c) => p + c, 0);

    const handleClick = (ev: string) => () => {
        const stackTraces = node.listenerStackTraces(ev)
        stackTraces.forEach(st => console.log(st));
    }

    if (total == 0)
        return null

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

function AddDeviceHostForm() {
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const [selected, setSelected] = useState("button");
    const hosts = [
        {
            name: "button",
            services: () => [new ButtonServiceHost()]
        }
    ];
    const handleChange = (ev: React.ChangeEvent<{ value: unknown }>) => {
        setSelected(ev.target.value as string);
    };
    const handleClick = () => {
        const host = hosts.find(h => h.name === selected);
        const d = new JDDeviceHost(host.services());
        bus.addDeviceHost(d);
    }

    return <>
        <SelectWithLabel helperText={"Select the service that will run on the virtual device"} label={"Virtual device"} value={selected} onChange={handleChange}>
            {hosts.map((host, i) => <MenuItem key={host.name} value={host.name}>{host.name}</MenuItem>)}
        </SelectWithLabel>
        <IconButtonWithTooltip title="Start new device. Reload page to clear out." onClick={handleClick}>
            <AddIcon />
        </IconButtonWithTooltip>
    </>
}

export default function WebDiagnostics() {
    const [expanded, setExpanded] = React.useState<string | false>(false);
    const [v, setV] = useState(0)
    const handleRefresh = () => {
        setV(v + 1);
    }

    const handleChange = (panel: string) => (event: React.ChangeEvent<{}>, isExpanded: boolean) => {
        setExpanded(isExpanded ? panel : false);
    };

    return <Alert severity="info">
        <AlertTitle>Diagnostics <Button variant="outlined" onClick={handleRefresh}>refresh</Button></AlertTitle>
        <Grid container spacing={1}>
            <Grid item xs={12}>
                <AddDeviceHostForm />
            </Grid>
            <Grid item xs={12}>
                <p>This diagnostics view does not register events to refresh automatically. Click the button above to refresh data.</p>
                <Accordion expanded={expanded === 'listeners'} onChange={handleChange('listeners')}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>Event Listeners</AccordionSummary>
                    <AccordionDetails>
                        <NodeListeners />
                    </AccordionDetails>
                </Accordion>
            </Grid>
            <Grid item xs={12}>
                <Accordion expanded={expanded === 'calls'} onChange={handleChange('calls')}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>Event Calls</AccordionSummary>
                    <AccordionDetails>
                        <NodeCalls />
                    </AccordionDetails>
                </Accordion>
            </Grid>
        </Grid>
    </Alert>
}
