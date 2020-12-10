import React from "react"
import DeviceList from "../../components/DeviceList";
import { createMuiTheme, responsiveFontSizes } from "@material-ui/core";
import ThemedLayout from "../../components/ThemedLayout";

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
        <DeviceList />
    </ThemedLayout>
}
