import React from "react";
import { Typography } from "@material-ui/core";
import { JDService } from "../../../src/dom/service";
import { Button } from "gatsby-theme-material-ui";

export default function CommandInput(props: { service: JDService, command: jdspec.PacketInfo, showDeviceName?: boolean }) {
    const { service, command, showDeviceName } = props;

    const handleClick = () => {
        // todo args
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