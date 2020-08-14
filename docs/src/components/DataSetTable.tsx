import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
// tslint:disable-next-line: no-submodule-imports
import Table from '@material-ui/core/Table';
// tslint:disable-next-line: no-submodule-imports
import TableBody from '@material-ui/core/TableBody';
// tslint:disable-next-line: no-submodule-imports
import TableCell from '@material-ui/core/TableCell';
// tslint:disable-next-line: no-submodule-imports
import TableContainer from '@material-ui/core/TableContainer';
// tslint:disable-next-line: no-submodule-imports
import TableHead from '@material-ui/core/TableHead';
// tslint:disable-next-line: no-submodule-imports
import TableRow from '@material-ui/core/TableRow';
// tslint:disable-next-line: no-submodule-imports
import Paper from '@material-ui/core/Paper';
import { DataSet } from './DataSet';
import { prettyDuration } from '../../../src/dom/pretty';

const useStyles = makeStyles({
  table: {
    minWidth: "10rem"
  },
});

export default function DataSetTable(props: { dataSet: DataSet, rows?: number, className?: string }) {
  const { dataSet, rows, className } = props
  const classes = useStyles();

  return (
    <TableContainer className={className} component={Paper}>
      <Table className={classes.table} aria-label="simple table" size="small">
        <TableHead>
          <TableRow>
            <TableCell align="right" key="time">Time</TableCell>
            {dataSet.headers.map(header => <TableCell align="right" key={`header` + header}>{header}</TableCell>)}
          </TableRow>
        </TableHead>
        <TableBody>
          {dataSet.rows.slice(rows !== undefined ? -rows : 0).map((row, index) =>
            <TableRow key={`row` + index}>
              <TableCell key="headers" align="right" key="timestamp">{prettyDuration(row.timestamp - dataSet.startTimestamp)}</TableCell>
              {row.data.map((v,i) => <TableCell key={"cell" + i} align="right">{v}</TableCell>)}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}