import { createStyles, darken, IconButton, lighten, makeStyles, Theme } from "@material-ui/core"
import { Button } from "gatsby-theme-material-ui"
import React, { useContext, useState } from "react"
import AppContext from "./AppContext"
// tslint:disable-next-line: match-default-export-name no-submodule-imports
import ErrorIcon from '@material-ui/icons/Error';
// tslint:disable-next-line: match-default-export-name no-submodule-imports
import CheckIcon from '@material-ui/icons/Check';
import { delay } from "../../../src/dom/utils";

const ACK_RESET_DELAY = 1000
const ERROR_RESET_DELAY = 2000

const useStyles = makeStyles((theme: Theme) => {
    const getColor = theme.palette.type === 'light' ? darken : lighten;
    const getBackgroundColor = theme.palette.type === 'light' ? lighten : darken;
    return createStyles({
        ack: {
            color: '#fff',
            fontWeight: theme.typography.fontWeightMedium,
            backgroundColor: theme.palette.success.main
        },
        error: {
            color: getColor(theme.palette.error.main, 0.6),
            backgroundColor: getBackgroundColor(theme.palette.error.main, 0.9),
        },
    })
})

export default function CmdButton(props: {
    onClick: (ev: React.MouseEvent<HTMLButtonElement>) => Promise<void>,
    className?: string,
    title?: string,
    children?: any,
    icon?: JSX.Element,
    size?: "small" | undefined,
    variant?: "outlined" | "contained" | undefined,
    disabled?: boolean
}) {
    const { onClick, children, icon, title, disabled, ...others } = props
    const { setError: setAppError } = useContext(AppContext)
    const classes = useStyles()
    const [working, setWorking] = useState(false)
    const [ack, setAck] = useState(false)
    const [error, setError] = useState(undefined)

    const _disabled = disabled || working || error;

    const handleClick = async (ev: React.MouseEvent<HTMLButtonElement>) => {
        ev.stopPropagation()
        try {
            setError(undefined)
            setAck(false)
            setWorking(true)
            await onClick(ev)
            setAck(true)
            await delay(ACK_RESET_DELAY)
            setAck(false)
        }
        catch (e) {
            setAppError(e)
            setError(e)
            await delay(ERROR_RESET_DELAY)
            setError(undefined)
        }
        finally {
            setWorking(false)
        }
    }

    const statusIcon = error ? <ErrorIcon /> : ack ? <CheckIcon /> : undefined;
    const className = error ? classes.error : ack ? classes.ack : undefined;

    if (!children && icon)
        return <IconButton
            className={className}
            onClick={handleClick}
            aria-label={title}
            title={title}
            disabled={_disabled}
            {...others}>{statusIcon || icon}</IconButton>
    else
        return <Button
            className={className}
            startIcon={icon}
            endIcon={statusIcon}
            onClick={handleClick}
            aria-label={title}
            title={title}
            disabled={_disabled}
            {...others}>{children}</Button>
}