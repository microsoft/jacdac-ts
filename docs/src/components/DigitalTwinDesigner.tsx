import { Grid, TextField } from "@material-ui/core";
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

interface DigitalTwinComponent {
    name: string;
    serviceClass: number;
    packetIds: jdspec.PacketInfoRef;
}

interface DigitalTwinSpec {
    displayName: string;
    components: DigitalTwinComponent[];
}

function ComponentTreeItem(props: { component: DigitalTwinComponent }) {

}

export default function DigitalTwinDesigner() {
    const variant = "outlined";
    const { value: twin, setValue: setTwin } = useLocalStorage<DigitalTwinSpec>('jacdac:digitaltwin;1',
        {
            displayName: "mydesigner",
            components: []
        } as DigitalTwinSpec);

    // tree view
    const [expanded, setExpanded] = useState<string[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const handleToggle = (event: React.ChangeEvent<{}>, nodeIds: string[]) => {
        setExpanded(nodeIds);
    };
    const handleSelect = (event: React.ChangeEvent<{}>, nodeIds: string[]) => {
        setSelected(nodeIds);
    };

    const update = () => {
        setTwin(clone(twin));
    }
    const handleDisplayNameChange = (ev: ChangeEvent<HTMLInputElement>) => {
        twin.displayName = ev.target.value;
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
            <TreeView
                defaultCollapseIcon={<ArrowDropDownIcon />}
                defaultExpandIcon={<ArrowRightIcon />}
                expanded={expanded}
                selected={selected}
                onNodeToggle={handleToggle}
                onNodeSelect={handleSelect}
            >
                {twin?.components?.map((component, i) => <ComponentTreeItem
                    key={`component${i}`}
                    component={component}
                    expanded={expanded}
                    selected={selected}
                />)}
            </TreeView>
        </Grid>
    </Grid>
}