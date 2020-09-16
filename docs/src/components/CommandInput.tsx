import React from "react";
import { Typography } from "@material-ui/core";
import { JDService } from "../../../src/dom/service";
import { Button } from "gatsby-theme-material-ui";
import DeviceName from "./DeviceName";

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
                <DeviceName device={service.device} />/
        </Typography>}
            {command.name}
        </Button>
    </React.Fragment>
}