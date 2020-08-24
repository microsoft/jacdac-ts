// tslint:disable-next-line: no-submodule-imports
import Snackbar from '@material-ui/core/Snackbar';
// tslint:disable-next-line: no-submodule-imports
import Alert from '@material-ui/lab/Alert';
import React, { useContext, useEffect, useState } from 'react';
import { ERROR } from '../../../src/dom/constants';
import { isCancelError } from '../../../src/dom/utils';
import JACDACContext from '../../../src/react/Context';

export default function ErrorSnackbar() {
  const { bus } = useContext(JACDACContext)
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(undefined)

  useEffect(() => bus.subscribe(ERROR, (e: { exception: Error }) => {
    if (isCancelError(e.exception))
      return;
    setError(error);
    setOpen(true);
  }))

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
  };

  const message = error ? `${error.exception.message}` : ''
  return (
    <Snackbar
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'center',
      }}
      open={open}
      autoHideDuration={6000}
      onClose={handleClose}
    >
      <Alert severity="error">{message}</Alert>
    </Snackbar>
  );
}