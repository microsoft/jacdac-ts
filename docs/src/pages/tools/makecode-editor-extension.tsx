import React, {  } from "react"
import { createMuiTheme, responsiveFontSizes } from "@material-ui/core";
import ThemedLayout from "../../components/ThemedLayout";
import MakeCodeEditorExtension from "../../components/makecode/MakeCodeEditorExtension";

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
        <MakeCodeEditorExtension />
    </ThemedLayout>
}
