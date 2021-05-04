export interface Observer<T> {
    next?: (value: T) => void
    error?: (error: Error) => void
    complete?: () => void
}

export interface Observable<T> {
    subscribe(
        observer: Observer<T>
    ): {
        unsubscribe: () => void
    }
}
