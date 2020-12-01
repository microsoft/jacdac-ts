import { useEffect, useState } from "react"
import { JDService } from "../../../src/jdom/service"
import { JDServiceClient } from "../../../src/jdom/serviceclient"

export default function useServiceClient<T extends JDServiceClient>(service: JDService, factory: (service: JDService) => T) {
    const [client, setClient] = useState<T>(undefined)

    useEffect(() => {
        const c = factory(service)
        setClient(c)
        return () => c.unmount()
    }, [service])

    return client;
}