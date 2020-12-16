import { useEffect } from "react"

export default (event: string, handler: EventListenerOrEventListenerObject, passive = false) => {
    useEffect(() => {
        if (typeof window === "undefined")
            return undefined; // SSR

        // initiate the event handler
        window.addEventListener(event, handler, passive)

        // this will clean up the event every time the component is re-rendered
        return () => {
            window.removeEventListener(event, handler)
        }
    }, [event, handler, passive])
}