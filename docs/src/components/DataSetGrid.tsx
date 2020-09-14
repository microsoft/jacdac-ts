import { Card, CardActions, CardContent, CardHeader, Grid, IconButton } from "@material-ui/core";
import { Button } from "gatsby-theme-material-ui";
import React, { useContext } from "react";
import { prettyDuration } from "../../../src/dom/pretty";
import { DataSet } from "./DataSet";
import ServiceManagerContext from "./ServiceManagerContext";
import Trend from "./Trend";
import useGridBreakpoints from './useGridBreakpoints';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import SaveAltIcon from '@material-ui/icons/SaveAlt';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import DeleteIcon from '@material-ui/icons/Delete';


export default function DataSetGrid(props: { tables: DataSet[], handleDeleteTable?: (table: Table) => void }) {
    const { tables, handleDeleteTable } = props;
    const { fileStorage } = useContext(ServiceManagerContext)
    const gridBreakpoints = useGridBreakpoints()

    const handleDownload = (table: DataSet) => () => {
        const sep = ','
        const csv = table.toCSV(sep)
        fileStorage.saveText(`${table.name}.csv`, csv)
    }
    return <Grid container spacing={2}>
        {tables.map((table) =>
            <Grid item {...gridBreakpoints} key={`result` + table.id}>
                <Card>
                    <CardHeader
                        subheader={`${table.rows.length} rows, ${prettyDuration(table.duration)}`} />
                    <CardContent>
                        <div>{table.headers.join(', ')}</div>
                        <Trend dataSet={table} height={8} mini={true} />
                    </CardContent>
                    <CardActions>
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<SaveAltIcon />}
                            onClick={handleDownload(table)}>
                            Save
                        </Button>
                        {handleDeleteTable &&
                            <IconButton onClick={handleDeleteTable(table)}>
                                <DeleteIcon />
                            </IconButton>}
                    </CardActions>
                </Card>
            </Grid>)}
    </Grid>
}