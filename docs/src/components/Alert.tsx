import { Alert as MaterialAlert } from '@material-ui/lab';
import { styled } from '@material-ui/core';

const Alert = styled(MaterialAlert)(({ theme }) => ({
    marginBottom: theme.spacing(2)
}));

export default Alert;