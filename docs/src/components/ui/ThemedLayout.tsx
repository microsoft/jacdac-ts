import { CssBaseline, Theme, ThemeProvider } from "@material-ui/core";
import { ConfirmProvider } from "material-ui-confirm";
import { SnackbarProvider } from "notistack";
import React from "react";
import { IdProvider } from "react-use-id-hook";
import JACDACProvider from "../../jacdac/Provider";
import { AppProvider } from "../AppContext";
import { DbProvider } from "../DbContext";
import { PacketsProvider } from "../PacketsContext";
import { ServiceManagerProvider } from "../ServiceManagerContext";
import Helmet from "react-helmet";
import { MakeCodeSnippetProvider } from "../makecode/MakeCodeSnippetContext";

export default function ThemedLayout(props: { theme: Theme, maxSnack?: number, children: any }) {
    const { theme, maxSnack, children } = props;
    return (
        <ThemeProvider theme={theme}>
            <SnackbarProvider maxSnack={maxSnack || 1} dense={true}>
                <IdProvider>
                    <ConfirmProvider>
                        <DbProvider>
                            <JACDACProvider>
                                <ServiceManagerProvider>
                                    <PacketsProvider>
                                        <AppProvider>
                                            <MakeCodeSnippetProvider>
                                                <CssBaseline />
                                                <Helmet>
                                                    <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
                                                    <link rel="preconnect" href="https://raw.githubusercontent.com" crossOrigin="anonymous" />
                                                    <link rel="preconnect" href="https://www.youtube-nocookie.com" crossOrigin="anonymous" />
                                                    <meta
                                                        name="viewport"
                                                        content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no"
                                                    />
                                                </Helmet>
                                                {children}
                                            </MakeCodeSnippetProvider>
                                        </AppProvider>
                                    </PacketsProvider>
                                </ServiceManagerProvider>
                            </JACDACProvider>
                        </DbProvider>
                    </ConfirmProvider>
                </IdProvider>
            </SnackbarProvider>
        </ThemeProvider>
    )
}