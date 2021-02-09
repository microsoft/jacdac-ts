import { Box, Chip, Divider, Grid, InputAdornment, TextField } from "@material-ui/core";
import React, { useMemo, useState } from "react";
import ServiceSpecificationList from "./ServiceSpecificationList";
import { useDebounce } from 'use-debounce';
import SearchIcon from '@material-ui/icons/Search';
import ChipList from "./ui/ChipList";
import { deviceSpecificationsForService, resolveMakecodeServiceFromClassIdentifier, serviceSpecifications } from "../../../src/jdom/spec";
import { arrayConcatMany, unique } from "../../../src/jdom/utils";
import MakeCodeIcon from "./icons/MakeCodeIcon";
import { VIRTUAL_DEVICE_NODE_NAME } from "../../../src/jacdac";
import KindIcon from "./KindIcon";
import { hostDefinitionFromServiceClass } from "../../../src/hosts/hosts";
import JacdacIcon from "./icons/JacdacIcon";

export default function ServiceCatalog() {
    const [query, setQuery] = useState("");
    const [dquery] = useDebounce(query, 500);
    const [tags, setTags] = useState<string[]>([]);
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
        return r;
    }, [dquery, tags, makeCode, simulator, devices]);
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
                {allTags.map(tag => <Chip key={tag} label={tag} onClick={handleTagClick(tag)}
                    variant={tags.indexOf(tag) > -1 ? "default" : "outlined"}
                    color={tags.indexOf(tag) > -1 ? "primary" : undefined} />)}
                <Divider orientation="vertical" flexItem />
                <Chip label="Simulator" icon={<KindIcon kind={VIRTUAL_DEVICE_NODE_NAME} />} variant={simulator ? "default" : "outlined"}
                    color={simulator ? "secondary" : undefined} onClick={handleSimulatorClick} />
                <Chip label="Devices" icon={<JacdacIcon />} variant={simulator ? "default" : "outlined"}
                    color={simulator ? "secondary" : undefined} onClick={handleDevicesClick} />
                <Chip label="MakeCode" icon={<MakeCodeIcon />} variant={makeCode ? "default" : "outlined"}
                    color={makeCode ? "secondary" : undefined} onClick={handleMakeCodeClick} />
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