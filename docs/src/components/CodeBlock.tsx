// src/components/CodeDemo.js
import React from 'react';
import { Paper } from '@material-ui/core';

// This is a container component to render our demos and their code
export default function CodeDemo(props: { code: string, children: any }) {
    const { code, children } = props;

    return (
        <Paper>
            <div>
                {children} {/* the react rendered demo */}
            </div>
            <pre>{code}</pre> {/* code block as a string */}
        </Paper>
    );
}