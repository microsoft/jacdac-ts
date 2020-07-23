import { Button } from "gatsby-theme-material-ui";
import React from 'react';
import { JDService } from "../../../src/dom/service";

const ServiceButton = (props: { service: JDService, onClick?: () => void}) => {
    const { service, onClick } = props;
    return <Button
            variant="contained"
            color="primary"
            onClick={onClick}>
            {service.name}
        </Button>
}

export default ServiceButton;