import { Card, CardActions, CardContent, CardHeader } from "@material-ui/core";
import React, { useState } from "react";
import CmdButton from "./CmdButton";
import Snippet from "./Snippet"

export type TestLogger = (name: string, ...msg: any) => void;
export type Test = (log: TestLogger) => Promise<void>;

export default function TestCard(props: {
    title: string,
    children: any,
    onTest: Test
}) {
    const { title, onTest, children } = props;
    const [output, setOutput] = useState("");

    const handleClick = async () => {
        const log: string[] = [];
        const logger = (msg: any) => {
            if (msg === undefined || msg === null)
                log.push("")
            else if (Array.isArray(msg)) {
                log.push(JSON.stringify(msg))
            } else if (typeof msg === "object") {
                Object.keys(msg)
                    .forEach(k => log.push(`${k}: ${JSON.stringify(msg[k])}`))
            } else
                log.push("" + msg);
        }

        try {
            setOutput("");
            await onTest(logger);
        } catch (e) {
            logger(e);
            throw e;
        } finally {
            setOutput(log.join('\n'))
        }
    }

    return <Card>
        <CardHeader title={title} />
        <CardContent>
            {children}
            {output && <Snippet value={output} />}
        </CardContent>
        <CardActions>
            <CmdButton variant="outlined" onClick={handleClick} disableReset={true}>Test</CmdButton>
        </CardActions>
    </Card>
}