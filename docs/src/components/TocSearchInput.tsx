import React, { useState } from 'react';
// tslint:disable-next-line: no-submodule-imports
import TextField from '@material-ui/core/TextField';
// tslint:disable-next-line: no-submodule-imports
import Autocomplete from '@material-ui/lab/Autocomplete';
import { Link } from 'gatsby-theme-material-ui';

function useSearchResults(query: string): { url: string; title: string; }[] {
    // adicionar variável para língua
    const index = (window as any).__FLEXSEARCH__.en.index
    const store = (window as any).__FLEXSEARCH__.en.store
    if (!query?.length || !index) {
        return []
    } else {
        let results = []
        // search the indexed fields
        Object.keys(index).forEach(idx => {
            // more search options at https://github.com/nextapps-de/flexsearch#index.search
            results.push(...index[idx].values.search(query))
        })

        // find the unique ids of the nodes
        results = Array.from(new Set(results))

        // return the corresponding nodes in the store
        const nodes = store
            .filter(node => (results.includes(node.id) ? node : null))
            .map(node => node.node)

        return nodes
    }
}

export default function TocSearchInput(props: {}) {
    const [query, setQuery] = useState("")
    const results = useSearchResults(query)

    const handleKeyUp = (event: React.KeyboardEvent<HTMLInputElement>) => {
        setQuery((event.target as HTMLInputElement).value)
    }
    const handleRenderInput = (params) => (
        <TextField
            {...params}
            label="Search"
            margin="normal"
            variant="outlined"
            InputProps={{ ...params.InputProps, type: 'search' }} />
    )
    const handleRenderOption = (option) => {
        return <Link to={option.url}>{option.title}</Link>
    }
    const getOptionLabel = (option) => {
        console.log('optionlabel', option)
        return option?.title || option?.url || ""
    }

    return (
        <Autocomplete
            freeSolo
            onKeyUp={handleKeyUp}
            options={results}
            getOptionLabel={getOptionLabel}
            renderOption={handleRenderOption}
            renderInput={handleRenderInput}
            limitTags={10}
            size="small"
        />
    );
}
