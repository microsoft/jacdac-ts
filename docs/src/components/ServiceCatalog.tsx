import { Grid, InputAdornment, TextField } from "@material-ui/core";
import React, { useCallback, useMemo, useState } from "react";
import ServiceSpecificationList from "./ServiceSpecificationList";
import { useDebounce } from 'use-debounce';
import { serviceSpecifications } from "../../../src/jacdac";
import SearchIcon from '@material-ui/icons/Search';
import ClearIcon from '@material-ui/icons/Clear';
import IconButtonWithTooltip from "./ui/IconButtonWithTooltip";

export default function ServiceCatalog(props: {}) {
    const [query, setQuery] = useState("");
    const [dquery] = useDebounce(query, 500);
    const services = useMemo(() => {
        const m = dquery.toLowerCase();
        let r = serviceSpecifications();
        if (m) {
            const filter = (s: string) => s?.toLowerCase().indexOf(m) > -1;
            r = r.filter(srv => filter(srv.name) || filter(srv.notes["short"]));
        }
        return r;
    }, [dquery]);
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(event.target.value)
    }

    return <Grid container>
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