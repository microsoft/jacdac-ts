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

function CompanySelect(props: { error?: string, value?: string, onValueChange?: (name: string) => void }) {
    const { onValueChange, value, error } = props;
    const [company, setCompany] = useState(value)
    const companies = useMemo(() => unique(deviceSpecifications().map(dev => dev.company)), []);

    const handleChange = (ev: unknown, newValue: string) => {
        setCompany(newValue);
        onValueChange?.(newValue);
    }
    const renderInputs = (params) => <TextField {...params}
        error={!!error}
        label="Company"
        helperText={error || helperText} variant="outlined" />

    const helperText = "Name of the company manufacturing this device. The company name will be used to generate the module identifier."
    return <Autocomplete
        freeSolo={true as any}
        fullWidth={true}
        includeInputInList
        autoComplete
        options={companies}
        renderInput={renderInputs}
        inputValue={company}
        onInputChange={handleChange} />
}

export default function DeviceDesigner() {
    const { value: device, setValue: setDevice } = useLocalStorage<jdspec.DeviceSpec>('jacdac:devicedesigner;2',
        {
            id: "my-device",
            name: "My device",
            services: [],
            firmwares: [],
            repo: ""
        } as jdspec.DeviceSpec)
    const updateDevice = () => {
        setDevice(clone(device));
    }
    const [servicesAnchorEl, setServicesAnchorEl] = React.useState<null | HTMLElement>(null);
    const [firmwaresAnchorEl, setFirmwaresAnchorEl] = React.useState<null | HTMLElement>(null);
    const [imageBase64, setImageBase64] = useState<string>(undefined);
    const firmwareMenuId = useId();
    const servicesMenuId = useId();
    const handleServiceAddClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setServicesAnchorEl(event.currentTarget);
    };
    const handleServiceAddClose = (id: number) => () => {
        setServicesAnchorEl(null);
        if (id !== undefined) {
            device.services.push(id)
            updateDevice();
        }
    };
    const companyRepos = useMemo(() => unique(deviceSpecifications()
        .filter(d => d.company === device.company)
        .map(d => d.repo)
        .filter(repo => !!repo)), [device?.company]);
    const { firmwareBlobs } = useFirmwareBlob(device.repo)
    const variant = "outlined";
    const companyError = !device.company
        ? "select a company"
        : "";
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
        : deviceSpecifications().find(dev => dev.id == device.id)
            ? "identifer already used"
            : "";
    const servicesError = !!device.services?.length
        ? ""
        : "Select at least one service"
    const imageError = !imageBase64 ? "missing image" : ""
    const ok = !nameError && parsedRepo && !linkError && !idError && !servicesError
        && !imageError && !companyError;

    const route = device.id?.split('-').join('/');
    const modulePath = ok && `devices/${route}.json`
    const imagePath = ok && `devices/${route}.jpg`

    const updateDeviceId = () => {
        const companyid = escapeDeviceIdentifier(device.company);
        const nameid = escapeDeviceNameIdentifier(device.name);
        device.id = companyid + '-' + nameid;
    }

    const handleNameChange = (ev: ChangeEvent<HTMLInputElement>) => {
        device.name = ev.target.value;
        updateDeviceId();
        updateDevice();
    }
    const handleRepoChange = (ev: unknown, newValue: string) => {
        device.repo = newValue;
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
    const handleFirmwareAddClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setFirmwaresAnchorEl(event.currentTarget);
        // device.firmwares.push(parseInt(uniqueFirmwareId(), 16))
        updateDevice();
    };
    const handleFirmwareAddRandomClick = () => {
        device.firmwares.push(parseInt(uniqueFirmwareId(), 16))
        updateDevice();
    };
    const handleFirmwareAddClose = (blob: FirmwareBlob) => () => {
        setFirmwaresAnchorEl(null);
        const id = blob?.firmwareIdentifier
        if (id !== undefined) {
            device.firmwares.push(id)
            device.name = blob.name
            updateDeviceId();
            updateDevice();
        }
    };
    const handleImageImported = (cvs: HTMLCanvasElement) => {
        const url = cvs.toDataURL("image/jpeg", 99)
        setImageBase64(url.slice(url.indexOf(',')))
    }
    const handleCompanyChanged = (value: string) => {
        device.company = value;
        updateDeviceId();
        updateDevice();
    }
    const renderRepoInput = (params) => <TextField {...params}
        error={!!githubError}
        type="url"
        label="Firmware repository *"
        helperText={githubError || "GitHub Repository hosting the firmware binaries."} variant="outlined" />

    return <Grid container direction="row" spacing={2}>
        <Grid item xs={12}>
            <CompanySelect value={device?.company} error={companyError} onValueChange={handleCompanyChanged} />
        </Grid>
        <Grid item xs={12}>
            <Autocomplete
                autoComplete
                placeholder="https://github.com/..."
                inputValue={device.repo || ""}
                onInputChange={handleRepoChange}
                options={companyRepos}
                renderInput={renderRepoInput}
            />
            {!githubError && <Box mt={1}><FirmwareCard slug={device.repo} /></Box>}
        </Grid>
        <Grid item xs={12}>
            <PaperBox elevation={1}>
                <Typography>
                    Firmwares
            </Typography>
                {device.firmwares?.map((id, i) => {
                    const blob = firmwareBlobs?.find(b => b.firmwareIdentifier == id);
                    return <Box component="span" ml={0.5} mb={0.5} key={i}>
                        <Chip
                            label={blob ? `${blob.name} (0x${id.toString(16)})` : `0x${id.toString(16)}`}
                            onDelete={handleDeleteFirmware(i)}
                        />
                    </Box>;
                })}
                <IconButtonWithTooltip title="Add random firmware identifier" onClick={handleFirmwareAddRandomClick}>
                    <CreateIcon />
                </IconButtonWithTooltip>
                {firmwareBlobs && <IconButtonWithTooltip title="Add firmware identifier from repository" aria-controls={firmwareMenuId}
                    aria-haspopup="true" onClick={handleFirmwareAddClick}>
                    <AddIcon />
                </IconButtonWithTooltip>}
                <Menu
                    id={firmwareMenuId}
                    anchorEl={firmwaresAnchorEl}
                    keepMounted
                    open={Boolean(firmwaresAnchorEl)}
                    onClose={handleFirmwareAddClose(undefined)}
                >
                    {firmwareBlobs?.map(blob => <MenuItem key={blob.firmwareIdentifier} value={blob.firmwareIdentifier.toString(16)}
                        onClick={handleFirmwareAddClose(blob)}>
                        {blob.name}
                        <Typography variant="caption" component="span">
                            {blob.version}
                        </Typography>
                    </MenuItem>)}
                </Menu>
                <Typography variant="caption" component="div">
                    Firmware identifiers uniquely identify your module on the JACDAC bus.
                    Each revision of your firmware may have a different identifier.
                </Typography>
            </PaperBox>
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
                <IconButtonWithTooltip title="Add a known service" aria-controls={servicesMenuId} aria-haspopup="true" onClick={handleServiceAddClick}>
                    <AddIcon />
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
                <Typography variant="caption" color={servicesError ? "error" : "inherit"} component="div">
                    {servicesError || "Select one or more services."}
                </Typography>
            </PaperBox>
        </Grid>
        <Grid item xs={12}>
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
                disabled
                error={!!idError}
                fullWidth={true}
                label="Identifier"
                helperText={"This generated identifer is a URL friendly string created from your company and product name."}
                variant={variant}
                value={device.id || ""}
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
                label="Home page url"
                error={!!linkError}
                helperText={linkError}
                fullWidth={true}
                placeholder="https://..."
                value={device.link || ""}
                onChange={handleLinkChange}
                variant={variant}
                type="url"
            />
        </Grid>
        <Grid item xs={12}>
            <PaperBox>
                <Typography color={imageError ? "error" : "inherit"}>
                    Catalog image
            </Typography>
                <ImportImageCanvas width={DEVICE_IMAGE_WIDTH} height={DEVICE_IMAGE_HEIGHT} onImageImported={handleImageImported} />
                <Typography variant="caption" color={imageError ? "error" : "inherit"} component="div">
                    {`Import a ${DEVICE_IMAGE_WIDTH}x${DEVICE_IMAGE_HEIGHT} image of the device.`}
                </Typography>
            </PaperBox>
        </Grid>
        <Grid item xs={12}>
            <PaperBox>
                <GithubPullRequestButton
                    label={"submit module"}
                    title={`Module: ${device.name}`}
                    head={device.id}
                    body={`This pull request adds a new module for JACDAC.`}
                    commit={`added ${device.name} files`}
                    files={modulePath && {
                        [modulePath]: JSON.stringify(normalizeDeviceSpecification(device), null, 2),
                        [imagePath]: {
                            content: imageBase64,
                            encoding: "base64"
                        }
                    }}
                />
            </PaperBox>
        </Grid>
    </Grid>
}
