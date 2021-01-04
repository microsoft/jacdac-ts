import { Grid, Switch } from "@material-ui/core";
import React, { useState } from "react";
import useGridBreakpoints from "../useGridBreakpoints";
import FirmwareCard from "./FirmwareCard";
// tslint:disable-next-line: no-submodule-imports
import useFirmwareRepos from "./useFirmwareRepos";
import LocalFileFirmwareCard from "./LocalFileFirmwareCard";

export default function FirmwareCardGrid() {
    const [showAllRepos, setShowAllRepos] = useState(false)
    const gridBreakpoints = useGridBreakpoints()
    const firmwareRepos = useFirmwareRepos(showAllRepos)

    return <Grid container spacing={2}>
        <Grid xs={12} item key="showall">
            <Switch checked={showAllRepos} onChange={() => setShowAllRepos(!showAllRepos)} />
            show all firmware repositories
        </Grid>
        <Grid {...gridBreakpoints} item key="localfile">
            <LocalFileFirmwareCard />
        </Grid>
        {firmwareRepos.map(firmwareRepo => <Grid {...gridBreakpoints} item key={`firmwarerepo${firmwareRepo}`}>
            <FirmwareCard slug={firmwareRepo} />
        </Grid>)}
    </Grid>
}
