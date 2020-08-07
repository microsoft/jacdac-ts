import React, { useEffect, useContext } from "react";
import { JDService } from "../../../src/dom/service";
import { isCommand } from "../../../src/dom/spec";
import CommandInput from "./CommandInput";

export default function ServiceCommands(props: {
    service: JDService,
    commandIdentifier?: number
}) {
    const { service, commandIdentifier } = props;
    const spec = service.specification;
    const packets = spec.packets;
    let commands = packets.filter(isCommand);
    if (commandIdentifier !== undefined)
        commands = commands.filter(cmd => cmd.identifier === commandIdentifier)

    return <React.Fragment>
        {commands.map(command => <CommandInput key={`cmd:${service.id}`} service={service} command={command} />)}
    </React.Fragment>
}