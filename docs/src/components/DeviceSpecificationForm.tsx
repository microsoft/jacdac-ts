import { Box, Chip, Grid, Menu, MenuItem, TextField, Typography } from '@material-ui/core';
import React, { ChangeEvent } from 'react';
import { SRV_CTRL } from '../../../src/jdom/constants';
import { serviceSpecificationFromClassIdentifier, serviceSpecifications } from '../../../src/jdom/spec';
import PaperBox from "./PaperBox"
import { uniqueFirmwareId } from './RandomGenerator';
// tslint:disable-next-line: match-default-export-name no-submodule-imports
import AddIcon from '@material-ui/icons/Add';
import IconButtonWithTooltip from "./IconButtonWithTooltip"

export default function DeviceSpecificationForm(props: { device: jdspec.DeviceSpec, updateDevice: () => void }) {
    const { device, updateDevice } = props;
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const handleServiceAddClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };
    const handleServiceAddClose = (id: number) => () => {
        setAnchorEl(null);
        if (id !== undefined) {
            device.services.push(id)
            updateDevice();
        }
    };
    const variant = "outlined";
    const nameError = device.name?.length > 32
        ? "name too long"
        : undefined;
    const githubError = !device.repo || /^https:\/\/github.com\/([^\/]+)\/([^\/]+)\/?$/.test(device.repo)
        ? ""
        : "invalid GitHub repository"
    const linkError = !device.link || /^https:\/\//.test(device.link)
        ? ""
        : "Must be https://..."

    const handleNameChange = (ev: ChangeEvent<HTMLInputElement>) => {
        device.name = ev.target.value;
        updateDevice();
    }
    const handleRepoChange = (ev: ChangeEvent<HTMLInputElement>) => {
        device.repo = ev.target.value;
        updateDevice();
    }
    const handleLinkChange = (ev: ChangeEvent<HTMLInputElement>) => {
        device.link = ev.target.value;
        updateDevice();
    }
    const handleDescriptionChange = (ev: ChangeEvent<HTMLInputElement>) => {
        device.description = ev.target.value;
        updateDevice();
    }
    const handleDeleteService = (i: number) => () => {
        device.services.splice(i, 1);
        updateDevice();
    }
    const handleDeleteFirmware = (i: number) => () => {
        device.firmwares.splice(i, 1);
        updateDevice();
    }
    const handleAddFirmware = () => {
        device.firmwares.push(parseInt(uniqueFirmwareId(), 16))
        updateDevice();
    }

    return <Grid container direction="row" spacing={2}>
        <Grid item xs={12}>
            <TextField
                required
                error={!!nameError}
                helperText={nameError}
                fullWidth={true}
                label="Name"
                placeholder="My Device"
                value={device.name || ""}
                onChange={handleNameChange}
                variant={variant}
            />
        </Grid>
        <Grid item xs={12}>
            <TextField
                fullWidth={true}
                required
                label="Description"
                multiline={true}
                rows={4}
                value={device.description || ""}
                onChange={handleDescriptionChange}
                variant={variant}
            />
        </Grid>
        <Grid item xs={12}>
            <TextField
                required
                error={!!githubError}
                helperText={githubError || "Repository hosting the firmware binaries."}
                fullWidth={true}
                label="GitHub Repository"
                placeholder="https://github.com/..."
                value={device.repo || ""}
                onChange={handleRepoChange}
                variant={variant}
                type="url"
            />
        </Grid>
        <Grid item xs={12}>
            <TextField
                label="GitHub Link"
                error={!!linkError}
                helperText={linkError || "Web page for more information"}
                fullWidth={true}
                placeholder="https://..."
                value={device.link || ""}
                onChange={handleLinkChange}
                variant={variant}
                type="url"
            />
        </Grid>
        <Grid item xs={12}>
            <PaperBox elevation={1}>
                <Typography>
                    Services *
            </Typography>
                {device.services?.map((id, i) => <Box component="span" m={0.5} key={i}>
                    <Chip
                        label={serviceSpecificationFromClassIdentifier(id)?.name || id}
                        onDelete={handleDeleteService(i)}
                    />
                </Box>)}
                <IconButtonWithTooltip title="Add a known service" aria-controls="services-menu" aria-haspopup="true" onClick={handleServiceAddClick}>
                    <AddIcon />
                </IconButtonWithTooltip>
                <Menu
                    id="services-menu"
                    anchorEl={anchorEl}
                    keepMounted
                    open={Boolean(anchorEl)}
                    onClose={handleServiceAddClose(undefined)}
                >
                    {serviceSpecifications()
                        .filter(srv => srv.classIdentifier !== SRV_CTRL && !/^_/.test(srv.shortId))
                        .map(srv => <MenuItem key={srv.classIdentifier} value={srv.classIdentifier.toString(16)}
                            onClick={handleServiceAddClose(srv.classIdentifier)}>
                            {srv.name}
                        </MenuItem>)}
                </Menu>
            </PaperBox>
        </Grid>
        <Grid item xs={12}>
            <PaperBox elevation={1}>
                <Typography>
                    Firmwares
            </Typography>
                {device.firmwares?.map((id, i) => <Box component="span" ml={0.5} mb={0.5} key={i}>
                    <Chip
                        label={`0x${id.toString(16)}`}
                        onDelete={handleDeleteFirmware(i)}
                    />
                </Box>)}
                <IconButtonWithTooltip title="Add random firmware identifier" aria-controls="firmware-menu" aria-haspopup="true" onClick={handleAddFirmware}>
                    <AddIcon />
                </IconButtonWithTooltip>
            </PaperBox>
        </Grid>
    </Grid>
}
