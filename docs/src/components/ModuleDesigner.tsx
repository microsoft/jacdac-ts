import React from 'react';
import { Grid } from '@material-ui/core';
import useLocalStorage from './useLocalStorage';
import { clone } from '../../../src/jdom/utils';
import { Box, Chip, Menu, MenuItem, TextField, Typography } from '@material-ui/core';
import { ChangeEvent } from 'react';
import { SRV_CTRL } from '../../../src/jdom/constants';
import { serviceSpecificationFromClassIdentifier, serviceSpecifications } from '../../../src/jdom/spec';
import PaperBox from "./PaperBox"
import { uniqueFirmwareId } from './RandomGenerator';
// tslint:disable-next-line: match-default-export-name no-submodule-imports
import AddIcon from '@material-ui/icons/Add';
import IconButtonWithTooltip from "./IconButtonWithTooltip"
import ApiKeyAccordion from './ApiKeyAccordion';
import { GITHUB_API_KEY, parseRepoUrl } from './github'
import GithubPullRequestButton from './GithubPullRequestButton'
import { normalizeDeviceSpecification } from "../../../jacdac-spec/spectool/jdspec"

export default function ModuleDesigner() {
    const { value: device, setValue: setDevice } = useLocalStorage<jdspec.DeviceSpec>('jacdac:devicedesigner;2',
        {
            name: "My device",
            services: [],
            firmwares: [],
            repo: ""
        } as jdspec.DeviceSpec)
    const updateDevice = () => {
        setDevice(clone(device));
    }
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
    const parsedRepo = parseRepoUrl(device.repo);
    const githubError = parsedRepo
        ? ""
        : "invalid GitHub repository"
    const linkError = !device.link || /^https:\/\//.test(device.link)
        ? ""
        : "Must be https://..."
    const idError = !device.id
        ? "missing identifier"
        : ""
    const devId = (device.name || "").replace(/[^a-z0-9_]/ig, '');
    const servicesError = !!device.services?.length
        ? ""
        : "Select at least one service"
    const ok = !nameError && parsedRepo && !linkError && !idError && !servicesError;
    const modulePath = ok && `modules/${parsedRepo.owner.toLowerCase()}/${devId.toLowerCase()}.json`

    const handleIdChange = (ev: ChangeEvent<HTMLInputElement>) => {
        device.id = ev.target.value.replace(/[^a-z0-9_\-]/ig, '');
        updateDevice();
    }
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
                error={!!idError}
                helperText={idError}
                fullWidth={true}
                label="Identifier"
                placeholder="abc"
                value={device.id || ""}
                onChange={handleIdChange}
                variant={variant}
            />
        </Grid>        <Grid item xs={12}>
            <TextField
                required
                error={!!nameError}
                helperText={nameError}
                fullWidth={true}
                label="Name"
                placeholder="My module"
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
                <Typography color={servicesError ? "error" : "inherit"}>
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
                <Typography variant="caption" color={servicesError ? "error" : "inherit"} component="div">
                    {servicesError || "Select one or more services."}
                </Typography>
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
                <Typography variant="caption" component="div">
                    Firmware identifiers uniquely identify your module on the JACDAC bus.
                    Each revision of your firmware may have a different identifier.
                </Typography>
            </PaperBox>
        </Grid>
        <Grid item xs={12}>
            <ApiKeyAccordion
                apiName={GITHUB_API_KEY}
                title="GitHub Developer Token"
                instructions={
                    <p>Open <a target="_blank" href="https://github.com/settings/tokens/new" rel="noreferrer nofollower">https://github.com/settings/tokens</a> and generate a new personal access token with **repo** scope.</p>
                }
            />
        </Grid>
        <Grid item xs={12}>
            <GithubPullRequestButton
                title={`Module definition: ${device.name}`}
                head={device.id}
                body={`This pull requests a new module for JACDAC.`}
                commit={`added ${device.name} files`}
                files={modulePath && {
                    [modulePath]: JSON.stringify(normalizeDeviceSpecification(device), null, 2)
                }}
            />
        </Grid>
    </Grid>
}
