import { Grid, List, ListItem, ListItemText, TextField } from "@material-ui/core";
import React, { ChangeEvent, useState } from "react";
import { clone } from "../../../src/jdom/utils";
import useLocalStorage from "./useLocalStorage";
// tslint:disable-next-line: no-submodule-imports
import TreeView from '@material-ui/lab/TreeView';
// tslint:disable-next-line: no-submodule-imports
import TreeItem, { TreeItemProps } from '@material-ui/lab/TreeItem';
// tslint:disable-next-line: no-submodule-imports
import Typography from '@material-ui/core/Typography';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import ArrowDropDownIcon from '@material-ui/icons/ArrowDropDown';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import ArrowRightIcon from '@material-ui/icons/ArrowRight';
import { StyledTreeItem, StyledTreeViewItemProps } from "./StyledTreeView";
import { serviceSpecificationFromClassIdentifier } from "../../../src/jdom/spec";
import AddServiceIconButton from "./AddServiceIconButton";
import { escapeDeviceIdentifier } from "../../../jacdac-spec/spectool/jdspec";
import ServiceSpecificationSelect from "./ServiceSpecificationSelect"

interface DigitalTwinComponent {
    name: string;
    service: jdspec.ServiceSpec;
}

interface DigitalTwinSpec {
    displayName: string;
    components: DigitalTwinComponent[];
}

export default function DigitalTwinDesigner() {
    const variant = "outlined";
    const { value: twin, setValue: setTwin } = useLocalStorage<DigitalTwinSpec>('jacdac:digitaltwin;1',
        {
            displayName: "mydesigner",
            components: []
        } as DigitalTwinSpec);


    const update = () => {
        setTwin(clone(twin));
    }
    const handleDisplayNameChange = (ev: ChangeEvent<HTMLInputElement>) => {
        twin.displayName = ev.target.value;
        update();
    }
    const handleAddService = (service: jdspec.ServiceSpec) => {
        twin.components.push({
            name: service.shortId,
            service
        })
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
        <Grid item xs={12}>
            <List>
                {twin.components.map(c => <ListItem>
                    <div>
                        <TextField variant="outlined" label="role" value={c.name} />
                        <ServiceSpecificationSelect />
                    </div>
                </ListItem>)}
            </List>
        </Grid>
        <Grid item xs={12}>
            <AddServiceIconButton onAdd={handleAddService} />
        </Grid>
    </Grid>
}