import { Grid, TextField } from "@material-ui/core";
import React, { ChangeEvent, useMemo } from "react";
import { clone, SMap, uniqueName } from "../../../../src/jdom/utils";
import useLocalStorage from "../useLocalStorage";
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import DeleteIcon from '@material-ui/icons/Delete';
import { serviceSpecificationFromClassIdentifier } from "../../../../src/jdom/spec";
import AddServiceIconButton from "../AddServiceIconButton";
import ServiceSpecificationSelect from "../ServiceSpecificationSelect"
import { DTDL_CONTEXT, escapeName, serviceSpecificationToComponent } from "../../../../src/azure-iot/dtdl"
import IconButtonWithTooltip from "../ui/IconButtonWithTooltip";
import Snippet from "../ui/Snippet";
import PaperBox from "../ui/PaperBox";

interface DigitalTwinComponent {
    name: string;
    service: jdspec.ServiceSpec;
}

interface DigitalTwinSpec {
    displayName: string;
    components: DigitalTwinComponent[];
}


function ComponentRow(props: { twin: DigitalTwinSpec, component: DigitalTwinComponent, onUpdate: () => void }) {
    const { component, onUpdate, twin } = props;
    const { name, service } = component;
    const { nameError, serviceError } = useMemo(() => validateTwinComponent(twin, component), [twin, component]);
    const handleComponentNameChange = (ev: ChangeEvent<HTMLInputElement>) => {
        component.name = escapeName(ev.target.value);
        onUpdate();
    }
    const handleSetService = (serviceClass: number) => {
        component.service = serviceSpecificationFromClassIdentifier(serviceClass);
        onUpdate();
    }
    const handleComponentDelete = () => {
        twin.components.splice(twin.components.indexOf(component), 1);
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

function validateTwinComponent(twin: DigitalTwinSpec, component: DigitalTwinComponent) {
    let serviceError: string = undefined;
    let nameError: string = undefined;
    const count = twin.components.filter(c => c.service.classIdentifier === component.service.classIdentifier).length
    if (count > 1)
        serviceError = `Multiple same service not supported.`
    return { serviceError, nameError }
}

export default function AzureDeviceTwinDesigner() {
    const variant = "outlined";
    const [twin, setTwin] = useLocalStorage<DigitalTwinSpec>('jacdac:digitaltwin;1',
        {
            displayName: "mydesigner",
            components: []
        } as DigitalTwinSpec);

    const dtdl = {
        "@type": "Interface",
        "@id": `dtmi:jacdac:devices:${escapeName(twin.displayName)},1`,
        displayName: twin.displayName,
        contents: twin.components.map(c => serviceSpecificationToComponent(c.service, c.name)),
        "@context": DTDL_CONTEXT
    }
    const dtdlSource = JSON.stringify(dtdl, null, 2);

    const update = () => {
        setTwin(clone(twin));
    }
    const handleDisplayNameChange = (ev: ChangeEvent<HTMLInputElement>) => {
        twin.displayName = ev.target.value;
        update();
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
        <Grid item xs={12}>
            <TextField
                required
                fullWidth={true}
                label="Display name"
                placeholder="My device"
                value={twin.displayName || ""}
                onChange={handleDisplayNameChange}
                variant={variant}
            />
        </Grid>
        {twin.components.map(c => <ComponentRow twin={twin} component={c} onUpdate={update} />)}
        <Grid item xs={12}>
            <AddServiceIconButton onAdd={handleAddService} />
        </Grid>
        <Grid item xs={12}>
            <PaperBox>
                <Snippet value={dtdlSource} mode="json" download="model" />
            </PaperBox>
        </Grid>
    </Grid>
}