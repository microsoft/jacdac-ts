import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography, useTheme } from "@material-ui/core";
import React, { useState } from "react"
import Packet from "../../../src/dom/packet";
import { toHex } from "../../../src/dom/utils";

export default function PacketHeaderLayout(props: { packet: Packet }) {
    const { packet } = props;
    const header = packet.header;
    const theme = useTheme();

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

    return <Paper>
        <Typography component="pre">
            <code>
                {slots.map(slot => <Box component="span" key={slot.name} mr={theme.spacing(0.1)}><Tooltip title={slot.name}>
                    <span>{toHex(header.slice(slot.offset, slot.offset + slot.size))}</span>
                </Tooltip></Box>)}
                <Box component="span" key={"reserved"} mr={theme.spacing(0.1)}><Tooltip title={"reserved"}>
                    <span>{toHex(header.slice(lastSlot.offset + lastSlot.size))}</span>
                </Tooltip></Box>
            </code>
        </Typography>
        <Box p={theme.spacing(0.25)}>
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
        </Box>
    </Paper>
}