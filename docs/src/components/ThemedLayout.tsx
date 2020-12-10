import { Theme, ThemeProvider } from "@material-ui/core";
import { ConfirmProvider } from "material-ui-confirm";
import { SnackbarProvider } from "notistack";
import React from "react";
import { IdProvider } from "react-use-id-hook";
import JACDACProvider from "../jacdac/Provider";
import { AppProvider } from "./AppContext";
import { DbProvider } from "./DbContext";
import { PacketsProvider } from "./PacketsContext";
import { ServiceManagerProvider } from "./ServiceManagerContext";

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
                                            {children}
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