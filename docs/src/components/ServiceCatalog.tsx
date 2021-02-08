import { Box, Chip, Grid, InputAdornment, TextField } from "@material-ui/core";
import React, { useMemo, useState } from "react";
import ServiceSpecificationList from "./ServiceSpecificationList";
import { useDebounce } from 'use-debounce';
import { arrayConcatMany, serviceSpecifications, unique } from "../../../src/jacdac";
import SearchIcon from '@material-ui/icons/Search';

export default function ServiceCatalog() {
    const [query, setQuery] = useState("");
    const [dquery] = useDebounce(query, 500);
    const [tags, setTags] = useState<string[]>([]);
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
        return r;
    }, [dquery, tags]);
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(event.target.value)
    }
    const handleClick = (tag: string) => () => {
        const i = tags.indexOf(tag);
        if (i < 0)
            setTags([...tags, tag]);
        else
            setTags([...tags.slice(0, i), ...tags.slice(i + 1)])
    }

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
            {allTags.map(tag => <Box component="span" key={tag} m={0.5}><Chip label={tag} onClick={handleClick(tag)}
                color={tags.indexOf(tag) > -1 ? "primary" : undefined} /></Box>)}
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