import React, {  } from "react"
import { Box, createMuiTheme, responsiveFontSizes, Typography } from "@material-ui/core";
import ThemedLayout from "../../components/ui/ThemedLayout";
import JDomTreeView from "../../components/JDomTreeView";

export default function Page() {
    const rawTheme = createMuiTheme({
        palette: {
            primary: {
                main: '#2e7d32',
            },
            secondary: {
                main: '#ffc400',
            },
        }
    })
    const theme = responsiveFontSizes(rawTheme);
    return <ThemedLayout theme={theme}>
        <Box m={0.5}>
            <Typography variant="subtitle2">
                Modules
            </Typography>
        </Box>
        <JDomTreeView dashboard={true} />
    </ThemedLayout>
}
