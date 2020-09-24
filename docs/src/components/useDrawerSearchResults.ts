import { useContext } from "react"
import AppContext from "./AppContext"

export interface SearchResult { url: string; title: string; }

export function useDrawerSearchResults(): SearchResult[] {
    // adicionar variável para língua
    const index = typeof window !== undefined
        && (window as any)?.__FLEXSEARCH__?.en?.index
    const store = typeof window !== undefined
        && (window as any)?.__FLEXSEARCH__?.en?.store
    const { searchQuery } = useContext(AppContext)
    if (!searchQuery || !index || searchQuery.length < 3) {
        return []
    } else {
        let results = []
        // search the indexed fields
        Object.keys(index).forEach(idx => {
            // more search options at https://github.com/nextapps-de/flexsearch#index.search
            results.push(...index[idx].values.search(searchQuery))
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