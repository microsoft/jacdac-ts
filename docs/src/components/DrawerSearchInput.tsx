import React, { useContext, useState } from 'react';
// tslint:disable-next-line: no-submodule-imports
import TextField from '@material-ui/core/TextField';
// tslint:disable-next-line: no-submodule-imports
import DrawerContext from './DrawerContext';

export default function DrawerSearchInput() {
    const { searchQuery, setSearchQuery } = useContext(DrawerContext)

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(event.target.value)
    }
    const handleBlur = () => setSearchQuery("")
    return <TextField
        label="Search"
        margin="normal"
        variant="outlined"
        type="search"
        size="small"
        value={searchQuery}
        onChange={handleChange}
        onBlur={handleBlur} />
}
