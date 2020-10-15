import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography, useTheme } from "@material-ui/core";
import React, { useState } from "react"
import {
    JD_FRAME_FLAG_ACK_REQUESTED, JD_FRAME_FLAG_COMMAND,
    JD_FRAME_FLAG_IDENTIFIER_IS_SERVICE_CLASS
} from "../../../src/dom/constants";
import Packet from "../../../src/dom/packet";
import { toHex } from "../../../src/dom/utils";
import { PaperBox } from "./PaperBox";

export default function PacketHeaderLayout(props: { packet: Packet }) {
    const { packet } = props;
    const header = packet.header;
    const theme = useTheme();
    const frameFlags = header[3];

    const slots = [
        {
            offset: 0,
            size: 2,
            name: "frame_crc",
            description: "CRC"
        },
        {
            offset: 2,
            size: 1,
            name: "frame_size",
            description: "Size of the data field in bytes."
        },
        {
            offset: 3,
            size: 1,
            name: "frame_flags",
            description: "Flags specific to this frame."
        },
        {
            offset: 4,
            size: 8,
            name: "device_identifiter",
            description: "64-bit device identifier"
        },
    ]
    const lastSlot = slots[slots.length - 1];

    const flags = [{
        position: 1,
        flag: JD_FRAME_FLAG_COMMAND,
        name: "COMMAND",
        description: "Determines if the frame contains command or report packets. If set, the frame contains command packets, if not set, the frame contains report packets."
    }, {
        position: 2,
        flag: JD_FRAME_FLAG_ACK_REQUESTED,
        name: "ACK_REQUESTED",
        description: "Determines if the receiver should return an ACK to the sender. If set, the receiver should repsond with an ACK frame, if not set, no response is required."
    }, {
        position: 4,
        flag: JD_FRAME_FLAG_IDENTIFIER_IS_SERVICE_CLASS,
        name: "IDENTIFIER_IS_SERVICE_CLASS",
        description: ""
    }].filter(f => frameFlags & f.flag);

    return <>
        <PaperBox padding={0}>
            <pre>
                <code>
                    {slots.map(slot => <Box component="span" key={slot.name} mr={theme.spacing(0.1)}><Tooltip title={slot.name}>
                        <span>{toHex(header.slice(slot.offset, slot.offset + slot.size))}</span>
                    </Tooltip></Box>)}
                    <Box component="span" key={"reserved"} mr={theme.spacing(0.1)}><Tooltip title={"reserved"}>
                        <span>{toHex(header.slice(lastSlot.offset + lastSlot.size))}</span>
                    </Tooltip></Box>
                </code>
            </pre>
        </PaperBox>
        <PaperBox>
            <TableContainer>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Value</TableCell>
                            <TableCell>Offset</TableCell>
                            <TableCell>Size</TableCell>
                            <TableCell>Name</TableCell>
                            <TableCell>Description</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {slots.map(slot => <TableRow key={slot.name}>
                            <TableCell><code>{toHex(header.slice(slot.offset, slot.offset + slot.size))}</code></TableCell>
                            <TableCell>{slot.offset}</TableCell>
                            <TableCell>{slot.size}</TableCell>
                            <TableCell>{slot.name}</TableCell>
                            <TableCell>{slot.description}</TableCell>
                        </TableRow>)}
                    </TableBody>
                </Table>
            </TableContainer>
        </PaperBox>
        {!!flags.length &&
            <PaperBox>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Flag</TableCell>
                                <TableCell>Name</TableCell>
                                <TableCell>Description</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {flags.map(flag => <TableRow key={flag.name}>
                                <TableCell><code>{flag.position}</code></TableCell>
                                <TableCell>{flag.name}</TableCell>
                                <TableCell>{flag.description}</TableCell>
                            </TableRow>)}
                        </TableBody>
                    </Table>
                </TableContainer>
            </PaperBox>}
    </>
}