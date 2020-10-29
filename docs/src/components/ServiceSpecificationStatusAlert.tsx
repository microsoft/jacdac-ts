import React from "react";
import Alert from "./Alert";

export default function ServiceSpecificationStatusAlert(props: { specification: jdspec.ServiceSpec }) {
    const { specification } = props;

    switch (specification?.status) {
        case "deprecated": return <Alert severity="warning">Deprecated</Alert>
        case "experimental": return <Alert severity="info">Experimental</Alert>
        default: return null;
    }
}