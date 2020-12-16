import { Grid, TextField } from "@material-ui/core";
import React, { ChangeEvent, useMemo, useState } from "react";
import { clone, uniqueName } from "../../../../src/jdom/utils";
import useChange from '../../jacdac/useChange';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import DeleteIcon from '@material-ui/icons/Delete';
import { resolveMakecodeService, serviceSpecificationFromClassIdentifier } from "../../../../src/jdom/spec";
import AddServiceIconButton from "../AddServiceIconButton";
import ServiceSpecificationSelect from "../ServiceSpecificationSelect"
import { escapeName } from "../../../../src/azure-iot/dtdl"
import IconButtonWithTooltip from "../IconButtonWithTooltip";
import useMakeCodeEditorExtensionClient from "./MakeCodeEditorExtensionClient";

interface ClientRole {
    name: string;
    service: jdspec.ServiceSpec;
}

interface Configuration {
    roles: ClientRole[];
}

function ClientRoleRow(props: { config: Configuration, component: ClientRole, onUpdate: () => void }) {
    const { component, onUpdate, config } = props;
    const { name, service } = component;
    const { nameError, serviceError } = useMemo(() => validateClientRole(config, component), [config, component]);
    const handleComponentNameChange = (ev: ChangeEvent<HTMLInputElement>) => {
        component.name = escapeName(ev.target.value);
        onUpdate();
    }
    const handleSetService = (serviceClass: number) => {
        component.service = serviceSpecificationFromClassIdentifier(serviceClass);
        onUpdate();
    }
    const handleComponentDelete = () => {
        config.roles.splice(config.roles.indexOf(component), 1);
        onUpdate();
    }
    return <Grid item xs={12}>
        <Grid container spacing={2}>
            <Grid item xs={6}>
                <TextField fullWidth={true} error={!!nameError} variant="outlined" label="name" helperText={nameError} value={name} onChange={handleComponentNameChange} />
            </Grid>
            <Grid item>
                <ServiceSpecificationSelect variant="outlined" label="service" serviceClass={service.classIdentifier} setServiceClass={handleSetService} error={serviceError} />
            </Grid>
            <Grid item>
                <IconButtonWithTooltip title="Remove service" onClick={handleComponentDelete}>
                    <DeleteIcon />
                </IconButtonWithTooltip>
            </Grid>
        </Grid>
    </Grid>
}

function validateClientRole(config: Configuration, role: ClientRole) {
    let serviceError: string = undefined;
    let nameError: string = undefined;
    return { serviceError, nameError }
}

export default function MakeCodeEditorExtension() {
    const client = useMakeCodeEditorExtensionClient();
    const visible = useChange(client, c => c?.visible);
    const [configuration, setConfiguration] = useState<Configuration>({
        roles: []
    } as Configuration);
    const hasMakeCodeService = (srv: jdspec.ServiceSpec) => !!resolveMakecodeService(srv)
    const update = () => {
        setConfiguration(clone(configuration));
    }
    const handleAddService = (service: jdspec.ServiceSpec) => {
        const names = configuration.roles.map(c => c.name)
        configuration.roles.push({
            name: uniqueName(names, service.shortId),
            service
        })
        update();
    }

    return <Grid container direction="row" spacing={2}>
        {configuration.roles.map(c => <ClientRoleRow config={configuration} component={c} onUpdate={update} />)}
        <Grid item xs={12}>
            <AddServiceIconButton serviceFilter={hasMakeCodeService} onAdd={handleAddService} />
        </Grid>
        <Grid item xs={12}>
        </Grid>
    </Grid>
}