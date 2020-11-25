import { Grid, TextField } from "@material-ui/core";
import React, { ChangeEvent } from "react";
import { clone, uniqueName } from "../../../src/jdom/utils";
import useLocalStorage from "./useLocalStorage";
// tslint:disable-next-line: no-submodule-imports
// tslint:disable-next-line: no-submodule-imports
// tslint:disable-next-line: no-submodule-imports
// tslint:disable-next-line: no-submodule-imports match-default-export-name
// tslint:disable-next-line: no-submodule-imports match-default-export-name
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import DeleteIcon from '@material-ui/icons/Delete';
import { serviceSpecificationFromClassIdentifier } from "../../../src/jdom/spec";
import AddServiceIconButton from "./AddServiceIconButton";
import ServiceSpecificationSelect from "./ServiceSpecificationSelect"
import { DTDL_CONTEXT, escapeName, serviceSpecificationToComponent } from "../../../src/azure-iot/dtdl"
import IconButtonWithTooltip from "./IconButtonWithTooltip";
import Snippet from "./Snippet";
import PaperBox from "./PaperBox";

interface DigitalTwinComponent {
    name: string;
    service: jdspec.ServiceSpec;
}

interface DigitalTwinSpec {
    displayName: string;
    components: DigitalTwinComponent[];
}

export default function AzureTwinDesigner() {
    const variant = "outlined";
    const { value: twin, setValue: setTwin } = useLocalStorage<DigitalTwinSpec>('jacdac:digitaltwin;1',
        {
            displayName: "mydesigner",
            components: []
        } as DigitalTwinSpec);

    const dtdl = {
        "@type": "Interface",
        "@id": "dtmi:jacdac:devices:TBD,1",
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
    const handleComponentNameChange = (c: DigitalTwinComponent) => (ev: ChangeEvent<HTMLInputElement>) => {
        c.name = escapeName(ev.target.value);
        update();
    }
    const handleSetService = (c: DigitalTwinComponent) => (serviceClass: number) => {
        c.service = serviceSpecificationFromClassIdentifier(serviceClass);
        update();
    }
    const handleComponentDelete = (c: DigitalTwinComponent) => () => {
        twin.components.splice(twin.components.indexOf(c), 1);
        update();
    }
    const nameError = ""

    return <Grid container direction="row" spacing={2}>
        <Grid item xs={12}>
            <TextField
                required
                error={!!nameError}
                helperText={nameError}
                fullWidth={true}
                label="Display name"
                placeholder="My device"
                value={twin.displayName || ""}
                onChange={handleDisplayNameChange}
                variant={variant}
            />
        </Grid>
        {twin.components.map(c => <Grid item xs={12}>
            <Grid container spacing={2}>
                <Grid item xs={6}>
                    <TextField fullWidth={true} variant="outlined" label="name" value={c.name} onChange={handleComponentNameChange(c)} />
                </Grid>
                <Grid item>
                    <ServiceSpecificationSelect variant="outlined" label="service" serviceClass={c.service.classIdentifier} setServiceClass={handleSetService(c)} />
                </Grid>
                <Grid item>
                    <IconButtonWithTooltip title="Remove service" onClick={handleComponentDelete(c)}>
                        <DeleteIcon />
                    </IconButtonWithTooltip>
                </Grid>
            </Grid>
        </Grid>)}
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