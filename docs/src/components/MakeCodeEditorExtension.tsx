import { Grid, TextField } from "@material-ui/core";
import React, { ChangeEvent, useMemo } from "react";
import { clone, uniqueName } from "../../../src/jdom/utils";
import useLocalStorage from "./useLocalStorage";
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import DeleteIcon from '@material-ui/icons/Delete';
import { serviceSpecificationFromClassIdentifier } from "../../../src/jdom/spec";
import AddServiceIconButton from "./AddServiceIconButton";
import ServiceSpecificationSelect from "./ServiceSpecificationSelect"
import { escapeName } from "../../../src/azure-iot/dtdl"
import IconButtonWithTooltip from "./IconButtonWithTooltip";

interface ClientRole {
    name: string;
    service: jdspec.ServiceSpec;
}

interface Configuration {
    components: ClientRole[];
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
        config.components.splice(config.components.indexOf(component), 1);
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
    const count = config.components.filter(c => c.service.classIdentifier === role.service.classIdentifier).length
    if (count > 1)
        serviceError = `Multiple same service not supported.`
    return { serviceError, nameError }
}

export default function MakeCodeEditorExtension() {
    const { value: twin, setValue: setTwin } = useLocalStorage<Configuration>('jacdac:mk;1',
        {
            displayName: "mydesigner",
            components: []
        } as Configuration);

    const update = () => {
        setTwin(clone(twin));
    }
    const handleAddService = (service: jdspec.ServiceSpec) => {
        const names = twin.components.map(c => c.name)
        twin.components.push({
            name: uniqueName(names, service.shortId),
            service
        })
        update();
    }

    return <Grid container direction="row" spacing={2}>
        {twin.components.map(c => <ClientRoleRow config={twin} component={c} onUpdate={update} />)}
        <Grid item xs={12}>
            <AddServiceIconButton onAdd={handleAddService} />
        </Grid>
        <Grid item xs={12}>
        </Grid>
    </Grid>
}