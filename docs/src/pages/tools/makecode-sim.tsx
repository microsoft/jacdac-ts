import React, { useContext, useState } from "react"
import { Card, CardContent, CardHeader, Collapse, createMuiTheme, Grid, GridSize, responsiveFontSizes, Typography } from "@material-ui/core";
import ThemedLayout from "../../components/ThemedLayout";
import JDomTreeView from "../../components/JDomTreeView";
import { JDService } from "../../../../src/jdom/service";
import useDeviceName from "../../components/useDeviceName";
import { JDRegister } from "../../../../src/jdom/register";
import { useRegisterHumanValue } from "../../jacdac/useRegisterValue";
import useChange from "../../jacdac/useChange";
import JACDACContext, { JDContextProps } from "../../../../src/react/Context";
import { isSensor } from "../../../../src/jdom/spec";

const ReadingItem = (props: { register: JDRegister, expanded: boolean, onExpanded: () => void }) => {
    const { register, expanded, onExpanded } = props;
    const { service, specification } = register;
    const deviceName = useDeviceName(service.device);
    const breakPoints: { xs: GridSize } = expanded ? { xs: 12 }
        : { xs: 6 };
    const humanValue = useRegisterHumanValue(register)

    return <Grid item {...breakPoints}>
        <Card onClick={!expanded && onExpanded}>
            <CardHeader title={expanded ? service.name : humanValue}
                subheader={deviceName}
            />
            <CardContent>
                <Collapse in={expanded}>
                    <Typography variant="h1">{humanValue}</Typography>
                </Collapse>
            </CardContent>
        </Card>
    </Grid>
}

const ReadingGrid = () => {
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const [expanded, setExpanded] = useState<any>(undefined)
    const readingRegisters = useChange(bus, bus =>
        bus.devices().map(device => device
            .services().find(srv => isSensor(srv.specification))
            ?.readingRegister
        ).filter(reg => !!reg))
    const handleSetExpanded = (i: any) => () => setExpanded(i)
    return <Grid container spacing={1}>
        {readingRegisters.map(reg => <ReadingItem key={reg.id} register={reg}
            expanded={reg === expanded}
            onExpanded={handleSetExpanded(reg)} />)}
    </Grid>
}

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
        <JDomTreeView dashboard={true} />
        <ReadingGrid />
    </ThemedLayout>
}
