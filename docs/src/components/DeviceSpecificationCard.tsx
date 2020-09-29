import React from "react"
import { Card, CardActions, CardContent, CardHeader, CardMedia, createStyles, Grid, makeStyles, Theme } from "@material-ui/core";
import { deviceSpecificationFromClassIdenfitier, deviceSpecificationFromIdentifier, serviceSpecificationFromClassIdentifier } from "../../../src/dom/spec";
import GitHubButton from "./GitHubButton"
import IDChip from "./IDChip";
import { Button, IconButton } from "gatsby-theme-material-ui";
// tslint:disable-next-line: match-default-export-name no-submodule-imports
import HomeIcon from '@material-ui/icons/Home';

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        media: {
            height: 0,
            paddingTop: '56.25%', // 16:9
        },
    }));

export default function DeviceSpecificationCard(props: {
    deviceIdentifier?: number,
    specificationIdentifier?: string,
    specification?: jdspec.DeviceSpec
}) {
    const { deviceIdentifier, specificationIdentifier, specification } = props;
    let spec: jdspec.DeviceSpec = specification;
    if (!spec && deviceIdentifier !== undefined)
        spec = deviceSpecificationFromClassIdenfitier(deviceIdentifier)
    if (!spec && specificationIdentifier !== undefined)
        spec = deviceSpecificationFromIdentifier(specificationIdentifier)
    const classes = useStyles();

    return <Card>
        <CardHeader
            title={spec?.name || "???"}
            subheader={<>{spec?.firmwares.map(fw => <IDChip key={fw} id={fw} />)}</>}
        />
        {spec?.image && <CardMedia
            className={classes.media}
            image={`https://raw.githubusercontent.com/microsoft/jacdac/main/devices/${spec.image}`}
            title={spec.name}
        />}
        {spec && <CardContent>
            {spec.services.map(service => serviceSpecificationFromClassIdentifier(service)).filter(sp => !!sp)
                .map(sspec => <Button key={sspec.shortId} to={`/services/${sspec.shortId}`}>{sspec.name}</Button>)}
        </CardContent>}
        {spec && <CardActions>
            <Button to={`/devices/${spec.id}`}>More...</Button>
            <IconButton to={spec.link} size="small">
                <HomeIcon />
            </IconButton>
            <GitHubButton repo={spec.repo} />
        </CardActions>}
    </Card>
}