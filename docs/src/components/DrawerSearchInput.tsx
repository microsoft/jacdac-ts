import React, { useContext, useState } from 'react';
// tslint:disable-next-line: no-submodule-imports
import TextField from '@material-ui/core/TextField';
// tslint:disable-next-line: no-submodule-imports
import AppContext from './AppContext';

export default function DrawerSearchInput() {
    const { searchQuery, setSearchQuery } = useContext(AppContext)

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(event.target.value)
    }
    return <TextField
        label="Search"
        margin="normal"
        variant="outlined"
        type="search"
        size="small"
        value={searchQuery}
        onChange={handleChange} />
}
