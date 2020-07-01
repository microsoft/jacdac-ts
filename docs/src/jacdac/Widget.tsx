import React from "react"
import { Paper, Divider, Box } from "@material-ui/core";

const style = {
    margin: "1rem"
}

const Widget = (props: { children }) =>
    <Box style={style}>
        {props.children}
    </Box>

export default Widget