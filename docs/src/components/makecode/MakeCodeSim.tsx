import React, {  } from "react"
import { createMuiTheme, responsiveFontSizes } from "@material-ui/core";
import ThemedLayout from "../../components/ui/ThemedLayout";
import Dashboard from "../../components/dashboard/Dashboard"

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
        <Dashboard />
    </ThemedLayout>
}
