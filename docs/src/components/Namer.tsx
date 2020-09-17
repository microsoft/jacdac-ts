import React, { useContext } from "react"
import { createStyles, makeStyles, Theme } from "@material-ui/core"
import JACDACContext, { JDContextProps } from "../../../src/react/Context"

const useStyles = makeStyles((theme: Theme) => createStyles({
    root: {
        marginBottom: theme.spacing(1)
    }
}))

export default function Namer(props: {}) {
    const classes = useStyles()
    const { bus } = useContext<JDContextProps>(JACDACContext)

    return <div className={classes.root}>

    </div>
}