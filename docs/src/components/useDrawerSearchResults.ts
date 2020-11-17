import { useContext, useRef } from "react"
import { useDebounce } from "use-debounce"
import AppContext from "./AppContext"
import useSearchIndex from "./useSearchIndex"

export interface SearchResult { url: string; title: string; }

export function useDrawerSearchResults(): SearchResult[] {
    const index = useSearchIndex()

    const { searchQuery: _searchQuery } = useContext(AppContext)
    const [searchQuery] = useDebounce(_searchQuery, 500)
    // debounce duplicate search
    const lastResult = useRef<{ searchQuery: string; nodes: SearchResult[]; }>(undefined)
    if (lastResult.current?.searchQuery === searchQuery)
        return lastResult.current.nodes;

    // spin up search
    console.log(`search "${searchQuery}"`)
    let nodes: SearchResult[] = undefined;
    if (searchQuery && index) {
        const results = index.search(searchQuery, <any>{
            /*fields: {
                title: { boost: 4 },
                description: { boost: 2 },
                body: { boost: 1 }
            },*/
            expand: true
        })
        console.log({ index, results })
        nodes = results.map(ref => index.documentStore.getDoc(ref))
        console.log(nodes)
    }

    // cache result
    lastResult.current = {
        searchQuery,
        nodes
    }
    return nodes;
}