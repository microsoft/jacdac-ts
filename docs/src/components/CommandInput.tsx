import React, { useEffect, useState } from "react";
import { Typography, Badge, Button } from "@material-ui/core";
import { JDService } from "../../../src/dom/service";

export default function CommandInput(props: { service: JDService, command: jdspec.PacketInfo, showDeviceName?: boolean }) {
    const { service, command, showDeviceName } = props;

    const handleClick = () => {
        // todo args
        console.log(`send command`, command)
        service.sendCmdAsync(command.identifier)
    }

    return <React.Fragment>
        <Button variant="contained"
            onClick={handleClick}>
            {showDeviceName && <Typography>
                {service.device.name}/
        </Typography>}
            {command.name}
        </Button>
    </React.Fragment>
}