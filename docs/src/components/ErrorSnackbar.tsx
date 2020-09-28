// tslint:disable-next-line: no-submodule-imports
import Snackbar from '@material-ui/core/Snackbar';
// tslint:disable-next-line: no-submodule-imports
import Alert from "./Alert";
import React, { useContext, useEffect, useState } from 'react';
import AppContext from './AppContext';

export default function ErrorSnackbar() {
  const { error, setError } = useContext(AppContext)
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(!!error)
  }, [error])

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setError(undefined);
  };

  const message = error ? `${error.message}` : ''
  return (
    <Snackbar
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'center',
      }}
      open={open}
      autoHideDuration={3000}
      onClose={handleClose}
    >
      <Alert severity="error">{message}</Alert>
    </Snackbar>
  );
}