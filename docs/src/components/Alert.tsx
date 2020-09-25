import { Alert as MaterialAlert } from '@material-ui/lab';
import { styled } from '@material-ui/core';

const Alert = styled(MaterialAlert)(({ theme }) => ({
    marginBottom: theme.spacing(1)
}));

export default Alert;