import React, { useEffect, useContext } from "react";
import { JDService } from "../../../src/dom/service";
import { isCommand } from "../../../src/dom/spec";
import CommandInput from "./CommandInput";

export default function ServiceCommands(props: {
    service: JDService,
    commandIdentifier?: number,
    commandArgs?: any[]
}) {
    const { service, commandIdentifier, commandArgs } = props;
    const spec = service.specification;
    const packets = spec.packets;
    let commands = packets.filter(isCommand);
    if (commandIdentifier !== undefined)
        commands = commands.filter(cmd => cmd.identifier === commandIdentifier)

    return <>
        {commands.map(command => <CommandInput key={`${service.id}:${command.identifier}`} service={service} command={command} args={commandArgs} />)}
    </>
}