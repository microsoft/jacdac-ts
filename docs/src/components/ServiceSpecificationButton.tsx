import React, { useContext } from 'react';
import DrawerContext, { DrawerType } from './DrawerContext';
import { Button } from 'gatsby-theme-material-ui';

export default function ServiceSpecificationButton() {
    const { setDrawerType } = useContext(DrawerContext)
    const onShowSpec = () => {
        setDrawerType(DrawerType.ServiceSpecification)
    }
    return (
        <Button variant="outlined" onClick={onShowSpec}>Service Specification Language</Button>
    );
}
