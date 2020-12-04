import { Card, CardActions, CardContent, CardHeader } from "@material-ui/core";
import React, { useState } from "react";
import CmdButton from "./CmdButton";
import Snippet from "./Snippet"

export type Test = () => Promise<void>;

export default function TestCard(props: {
    title: string,
    children: any,
    onTest: Test
}) {
    const { title, onTest, children } = props;
    const [error, setError] = useState<any>(undefined)

    const handleClick = async () => {
        try {
            setError(undefined);
            await onTest();
        } catch (e) {
            setError(e);
            throw e;
        }
    }

    return <Card>
        <CardHeader title={title} />
        <CardContent>
            {children}
            {error && <Snippet value={error.toString().trim()} />}
        </CardContent>
        <CardActions>
            <CmdButton variant="outlined" onClick={handleClick} disableReset={true}>Test</CmdButton>
        </CardActions>
    </Card>
}