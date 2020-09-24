import React, { useContext } from 'react';
import AppContext, { DrawerType } from './AppContext';
import { Button } from 'gatsby-theme-material-ui';

export default function ServiceSpecificationButton() {
    const { setDrawerType } = useContext(AppContext)
    const onShowSpec = () => {
        setDrawerType(DrawerType.ServiceSpecification)
    }
    return (
        <Button variant="outlined" onClick={onShowSpec}>Service Specification Language</Button>
    );
}
