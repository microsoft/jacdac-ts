import React, { useMemo, useState } from 'react';
import { Grid } from '@material-ui/core';
import useLocalStorage from './useLocalStorage';
import { clone, unique } from '../../../src/jdom/utils';
import { Box, Chip, Menu, MenuItem, TextField, Typography } from '@material-ui/core';
import { ChangeEvent } from 'react';
import { SRV_CTRL } from '../../../src/jdom/constants';
import { deviceSpecifications, serviceSpecificationFromClassIdentifier, serviceSpecifications } from '../../../src/jdom/spec';
import PaperBox from "./PaperBox"
import { uniqueFirmwareId } from './RandomGenerator';
// tslint:disable-next-line: match-default-export-name no-submodule-imports
import AddIcon from '@material-ui/icons/Add';
// tslint:disable-next-line: match-default-export-name no-submodule-imports
import CreateIcon from '@material-ui/icons/Create';
import IconButtonWithTooltip from "./IconButtonWithTooltip"
import { parseRepoUrl } from './github'
import GithubPullRequestButton from './GithubPullRequestButton'
import { DEVICE_IMAGE_HEIGHT, DEVICE_IMAGE_WIDTH, escapeDeviceIdentifier, escapeDeviceNameIdentifier, normalizeDeviceSpecification } from "../../../jacdac-spec/spectool/jdspec"
import ImportImageCanvas from './ImageImportCanvas';
import FirmwareCard from "./FirmwareCard"
// tslint:disable-next-line: no-submodule-imports
import { Autocomplete } from '@material-ui/lab/';
import { useFirmwareBlob } from './useFirmwareBlobs';
import { FirmwareBlob } from '../../../src/jdom/flashing';
import { useId } from "react-use-id-hook"

export default function AddServiceIconButton(props: {
    onAdd: (service: jdspec.ServiceSpec) => void,
    error?: string,
    children?: JSX.Element | JSX.Element[]
}) {
    const { error, onAdd, children } = props;
    const [servicesAnchorEl, setServicesAnchorEl] = React.useState<null | HTMLElement>(null);
    const servicesMenuId = useId();

    const handleServiceAddClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setServicesAnchorEl(event.currentTarget);
    };
    const handleServiceAddClose = (id: number) => () => {
        setServicesAnchorEl(null);
        if (id !== undefined) {
            const srv = serviceSpecificationFromClassIdentifier(id);
            onAdd(srv);
        }
    };

    return <>
        <IconButtonWithTooltip title="Add a service" aria-controls={servicesMenuId} aria-haspopup="true" onClick={handleServiceAddClick}>
            {children || <AddIcon />}
        </IconButtonWithTooltip>
        <Menu
            id={servicesMenuId}
            anchorEl={servicesAnchorEl}
            keepMounted
            open={Boolean(servicesAnchorEl)}
            onClose={handleServiceAddClose(undefined)}
        >
            {serviceSpecifications()
                .filter(srv => srv.classIdentifier !== SRV_CTRL && !/^_/.test(srv.shortId))
                .map(srv => <MenuItem key={srv.classIdentifier} value={srv.classIdentifier.toString(16)}
                    onClick={handleServiceAddClose(srv.classIdentifier)}>
                    {srv.name}
                </MenuItem>)}
        </Menu>
        <Typography variant="caption" color={error ? "error" : "inherit"} component="div">
            {error || "Select one or more services."}
        </Typography></>
}