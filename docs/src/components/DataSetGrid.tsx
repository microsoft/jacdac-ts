import { Card, CardActions, CardContent, CardHeader, Grid } from "@material-ui/core";
import { Button, IconButton } from "gatsby-theme-material-ui";
import React, { useContext } from "react";
import { prettyDuration } from "../../../src/jdom/pretty";
import ServiceManagerContext from "./ServiceManagerContext";
import Trend from "./Trend";
import useGridBreakpoints from './useGridBreakpoints';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import SaveAltIcon from '@material-ui/icons/SaveAlt';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import DeleteIcon from '@material-ui/icons/Delete';
import FieldDataSet from "./FieldDataSet";


export default function DataSetGrid(props: {
    tables: FieldDataSet[],
    handleDeleteTable?: (table: FieldDataSet) => void
}) {
    const { tables, handleDeleteTable } = props;
    const { fileStorage } = useContext(ServiceManagerContext)
    const gridBreakpoints = useGridBreakpoints(tables?.length)

    const handleDownload = (table: FieldDataSet) => () => {
        const sep = ','
        const csv = table.toCSV(sep)
        fileStorage.saveText(`${table.name}.csv`, csv)
    }
    const handelDelete = (table: FieldDataSet) => () => handleDeleteTable(table)
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
                            <IconButton onClick={handelDelete(table)}>
                                <DeleteIcon />
                            </IconButton>}
                    </CardActions>
                </Card>
            </Grid>)}
    </Grid>
}