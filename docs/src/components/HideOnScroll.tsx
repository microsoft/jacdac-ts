import { Slide, useScrollTrigger } from '@material-ui/core';
import React from 'react';

export default function HideOnScroll(props: { children: any, target?: Node | Window; }) {
    const { children, target } = props;
    const trigger = useScrollTrigger({ target });
    return (
        <Slide in={!trigger}>
            {children}
        </Slide>
    );
}