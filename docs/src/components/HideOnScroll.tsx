import { Slide, useScrollTrigger } from '@material-ui/core';
import React from 'react';

export default function HideOnScroll(props: { children: any }) {
    const trigger = useScrollTrigger();
    const { children } = props;
    return (
        <Slide in={!trigger}>
            {children}
        </Slide>
    );
}