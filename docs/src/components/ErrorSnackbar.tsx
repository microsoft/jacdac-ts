import React, { useEffect, useContext, useState } from 'react';
// tslint:disable-next-line: no-submodule-imports
import Snackbar from '@material-ui/core/Snackbar';
import { ERROR } from '../../../src/dom/constants'
import JacdacContext from '../../../src/react/Context';

export default function ErrorSnackbar() {
  const { bus } = useContext(JacdacContext)
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(undefined)

  useEffect(() => bus.subscribe(ERROR, error => {
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
        vertical: 'bottom',
        horizontal: 'center',
      }}
      open={open}
      autoHideDuration={6000}
      onClose={handleClose}
      message={message}
    />
  );
}