import { Button } from "gatsby-theme-material-ui";
import React from 'react';
import { Service } from "../../../src/dom/service";
import useChange from "../jacdac/useChange";

const ServiceButton = (props: { service: Service, onClick?: () => void}) => {
    const { service, onClick } = props;
    useChange(service);
    return <Button
            variant="contained"
            color="primary"
            onClick={onClick}>
            {service.name}
        </Button>
}

export default ServiceButton;