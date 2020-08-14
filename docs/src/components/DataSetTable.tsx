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

export default function DataSetTable(props: { dataSet: DataSet, rows?: number }) {
  const { dataSet, rows } = props
  const classes = useStyles();

  return (
    <TableContainer component={Paper}>
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
              <TableCell align="right" key="timestamp">{prettyDuration(row.timestamp - dataSet.startTimestamp)}</TableCell>
              {row.data.map(v => <TableCell align="right">{v}</TableCell>)}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}