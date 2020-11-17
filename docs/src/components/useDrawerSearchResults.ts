import { useContext, useRef } from "react"
import { useDebounce } from "use-debounce"
import AppContext from "./AppContext"

export interface SearchResult { url: string; title: string; }

export function useDrawerSearchResults(): SearchResult[] {
    // adicionar variável para língua
    const index = typeof window !== undefined
        && (window as any)?.__FLEXSEARCH__?.en?.index
    const store = typeof window !== undefined
        && (window as any)?.__FLEXSEARCH__?.en?.store
    const { searchQuery: _searchQuery } = useContext(AppContext)
    const [searchQuery] = useDebounce(_searchQuery, 500)
    const lastResult = useRef<{ searchQuery: string; nodes: SearchResult[]; }>(undefined)

    // cache hit
    if (lastResult.current?.searchQuery === searchQuery)
        return lastResult.current.nodes;

    console.log(`search "${searchQuery}"`)
    let nodes: SearchResult[] = undefined;
    if (searchQuery && index) {
        let results = []
        // search the indexed fields
        Object.keys(index).forEach(idx => {
            // more search options at https://github.com/nextapps-de/flexsearch#index.search
            results.push(...index[idx].values.search(searchQuery))
        })

        // find the unique ids of the nodes
        results = Array.from(new Set(results))

        // return the corresponding nodes in the store
        nodes = store
            .filter(node => (results.includes(node.id) ? node : null))
            .map(node => node.node)
    }

    lastResult.current = {
        searchQuery,
        nodes
    }
    return nodes;
}