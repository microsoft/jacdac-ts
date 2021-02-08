import React from "react";
import ServiceSpecificationList from "./ServiceSpecificationList";

export default function ServiceCatalog(props: {}) {
    return <>
        <ServiceSpecificationList title="Stable" status={["stable"]} infrastructure={false} />
        <ServiceSpecificationList title="Experimental" status={["experimental"]} infrastructure={false} />
        <ServiceSpecificationList title="Jacdac" infrastructure={true} />
        <ServiceSpecificationList title="Deprecated" status={["deprecated"]} infrastructure={false} />
    </>
}