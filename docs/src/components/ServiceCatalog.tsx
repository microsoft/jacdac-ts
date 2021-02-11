import { Chip, Divider, Grid, InputAdornment, TextField } from "@material-ui/core";
import React, { useMemo, useState } from "react";
import ServiceSpecificationList from "./ServiceSpecificationList";
import { useDebounce } from 'use-debounce';
import SearchIcon from '@material-ui/icons/Search';
import ChipList from "./ui/ChipList";
import { deviceSpecificationsForService, isSensor, resolveMakecodeServiceFromClassIdentifier, serviceSpecifications } from "../../../src/jdom/spec";
import { arrayConcatMany, unique } from "../../../src/jdom/utils";
import MakeCodeIcon from "./icons/MakeCodeIcon";
import { VIRTUAL_DEVICE_NODE_NAME } from "../../../src/jacdac";
import KindIcon from "./KindIcon";
import { hostDefinitionFromServiceClass } from "../../../src/hosts/hosts";
import JacdacIcon from "./icons/JacdacIcon";
import SpeedIcon from '@material-ui/icons/Speed';

interface ServiceFilter {
    query: string;
    tags: string[];
    sensors?: boolean;
    makeCode?: boolean;
    simulators?: boolean;
    devices?: boolean;
}

function FilterChip(props: { label: string, value: boolean, icon?: JSX.Element, onClick: () => void }) {
    const { label, value, icon, onClick, filter } = props;
    const descr = value ? `Disable ${label} filter` : `Filter by ${label} support`;
    return <Chip
        label={label}
        aria-label={descr}
        title={descr}
        icon={icon} variant={value ? "default" : "outlined"}
        color={value ? "secondary" : undefined} onClick={onClick} />
}

export default function ServiceCatalog() {
    const [filter, setFilter] = useState<ServiceFilter>({
        query: "",
        tags: []
    })
    const [deboundedFilter] = useDebounce(filter, 200);
    const { query, tags, makeCode, simulators, devices, sensors } = filter;
    const allTags = useMemo(() => unique(arrayConcatMany(serviceSpecifications().map(srv => srv.tags))), [])
    const services = useMemo(() => {
        const m = query.toLowerCase();
        let r = serviceSpecifications();
        if (m) {
            const filter = (s: string) => s?.toLowerCase().indexOf(m) > -1;
            r = r.filter(srv => filter(srv.name) || filter(srv.notes["short"]));
        }
        if (tags.length) {
            r = r.filter(srv => tags.every(tag => srv.tags.indexOf(tag) > -1))
        }
        if (makeCode)
            r = r.filter(srv => !!resolveMakecodeServiceFromClassIdentifier(srv.classIdentifier))
        if (simulators)
            r = r.filter(srv => !!hostDefinitionFromServiceClass(srv.classIdentifier))
        if (devices)
            r = r.filter(srv => !!deviceSpecificationsForService(srv.classIdentifier)?.length)
        if (sensors)
            r = r.filter(srv => isSensor(srv));
        return r;
    }, [deboundedFilter]);
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFilter({
            ...filter,
            query: event.target.value,
        })
    }
    const handleTagClick = (tag: string) => () => {
        const i = tags.indexOf(tag);
        if (i < 0)
            setFilter({ ...filter, tags: [...tags, tag] });
        else
            setFilter({ ...filter, tags: [...tags.slice(0, i), ...tags.slice(i + 1)] })
    }
    const handleMakeCodeClick = () => setFilter({ ...filter, makeCode: !makeCode });
    const handleSimulatorClick = () => setFilter({ ...filter, simulators: !simulators });
    const handleDevicesClick = () => setFilter({ ...filter, devices: !devices });
    const handleSensorsClick = () => setFilter({ ...filter, sensors: !sensors });

    return <Grid container spacing={1}>
        <Grid item xs={12}>
            <TextField
                margin="normal"
                type="search"
                variant="outlined"
                label="Search services"
                aria-label="Search services"
                fullWidth={true}
                value={query}
                onChange={handleChange}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon />
                        </InputAdornment>
                    ),
                }}
            />
        </Grid>
        <Grid item xs={12}>
            <ChipList>
                {allTags.map(tag => <FilterChip key={tag} label={tag} onClick={handleTagClick(tag)}
                    value={tags.indexOf(tag) > -1} />)}
                <FilterChip label="Sensors" icon={<SpeedIcon />} value={sensors} onClick={handleSensorsClick} />
                <Divider orientation="vertical" flexItem />
                <FilterChip label="Simulator" icon={<KindIcon kind={VIRTUAL_DEVICE_NODE_NAME} />} value={simulators} onClick={handleSimulatorClick} />
                <FilterChip label="Devices" icon={<JacdacIcon />} onClick={handleDevicesClick} value={devices} />
                <FilterChip label="MakeCode" icon={<MakeCodeIcon />} value={makeCode} onClick={handleMakeCodeClick} />
            </ChipList>
        </Grid>
        {!services.length && <Grid item>There are no services matching this request.</Grid>}
        <Grid item xs={12}>
            <ServiceSpecificationList title="Stable" status={["stable"]} infrastructure={false} services={services} />
        </Grid>
        <Grid item xs={12}>
            <ServiceSpecificationList title="Experimental" status={["experimental"]} infrastructure={false} services={services} />
        </Grid>
        <Grid item xs={12}>
            <ServiceSpecificationList title="Jacdac" infrastructure={true} services={services} />
        </Grid>
        <Grid item xs={12}>
            <ServiceSpecificationList title="Deprecated" status={["deprecated"]} infrastructure={false} services={services} />
        </Grid>
    </Grid >
}