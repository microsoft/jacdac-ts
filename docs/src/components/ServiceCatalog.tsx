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

function FilterChip(props: { label: string, value: boolean, icon?: JSX.Element, onClick: () => void }) {
    const { label, value, icon, onClick } = props;
    const descr = value ? `Disable ${label} filter` : `Filter by ${label} support`;
    return <Chip
        label={label}
        aria-label={descr}
        title={descr}
        icon={icon} variant={value ? "default" : "outlined"}
        color={value ? "secondary" : undefined} onClick={onClick} />
}

export default function ServiceCatalog() {
    const [query, setQuery] = useState("");
    const [dquery] = useDebounce(query, 500);
    const [tags, setTags] = useState<string[]>([]);
    const [sensors, setSensors] = useState(false);
    const [makeCode, setMakeCode] = useState(false);
    const [simulator, setSimulator] = useState(false);
    const [devices, setDevices] = useState(false);

    const allTags = useMemo(() => unique(arrayConcatMany(serviceSpecifications().map(srv => srv.tags))), [])
    console.log({ allTags })
    const services = useMemo(() => {
        const m = dquery.toLowerCase();
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
        if (simulator)
            r = r.filter(srv => !!hostDefinitionFromServiceClass(srv.classIdentifier))
        if (devices)
            r = r.filter(srv => !!deviceSpecificationsForService(srv.classIdentifier)?.length)
        if (sensors)
            r = r.filter(srv => isSensor(srv));
        return r;
    }, [dquery, tags, makeCode, simulator, devices, sensors]);
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(event.target.value)
    }
    const handleTagClick = (tag: string) => () => {
        const i = tags.indexOf(tag);
        if (i < 0)
            setTags([...tags, tag]);
        else
            setTags([...tags.slice(0, i), ...tags.slice(i + 1)])
    }
    const handleMakeCodeClick = () => setMakeCode(!makeCode);
    const handleSimulatorClick = () => setSimulator(!simulator);
    const handleDevicesClick = () => setDevices(!devices);
    const handleSensorsClick = () => setSensors(!sensors);

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
                <FilterChip label="Sensors" icon={<SpeedIcon />} value={simulator} onClick={handleSensorsClick} />
                <Divider orientation="vertical" flexItem />
                <FilterChip label="Simulator" icon={<KindIcon kind={VIRTUAL_DEVICE_NODE_NAME} />} value={simulator} onClick={handleSimulatorClick} />
                <FilterChip label="Devices" icon={<JacdacIcon />} value={devices} onClick={handleDevicesClick} />
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