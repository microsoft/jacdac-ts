import { useEffect, useState } from "react"
import { JDService } from "../../../src/dom/service"
import { JDServiceClient } from "../../../src/dom/serviceclient"

export default function useServiceClient<TServiceClient extends JDServiceClient>(service: JDService, factory: (service: JDService) => TServiceClient) {
    const [client, setClient] = useState<TServiceClient>(undefined)

    useEffect(() => {
        const c = service && factory(service);
        setClient(c)
        return () => c?.unmount();
    }, [service, factory])

    return client;
}