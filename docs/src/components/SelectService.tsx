import React, { useContext } from "react"
import useGridBreakpoints from "./useGridBreakpoints"
import JacdacContext, { JacdacContextProps } from "../jacdac/Context"
import useChange from "../jacdac/useChange"
import {
    Grid,
    Card,
    CardActions,
    Button
} from "@material-ui/core"
import DeviceCardHeader from "./DeviceCardHeader"
import Alert from "./ui/Alert"
import { JDService } from "../../../src/jdom/service"

export default function SelectService(props: {
    serviceClass: number
    onSelect: (service: JDService) => void
}) {
    const { bus } = useContext<JacdacContextProps>(JacdacContext)
    const { serviceClass, onSelect } = props
    const services = useChange(bus, n => n.services({ serviceClass }), [])
    const gridBreakpoints = useGridBreakpoints()

    const handleSelect = (service: JDService) => () => onSelect(service)

    return (
        <>
            {!!services.length && (
                <Grid container spacing={2}>
                    {services.map(service => (
                        <Grid key={service.id} item {...gridBreakpoints}>
                            <Card>
                                <DeviceCardHeader device={service.device} />
                                <CardActions>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        onClick={handleSelect(service)}
                                    >
                                        Select
                                    </Button>
                                </CardActions>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}
            {!services?.length && (
                <Alert severity="info">
                    Not seeing your device? Try some of the following.
                    <ul>
                        <li>Check that your device is connected</li>
                        <li>
                            Use the <strong>packet console</strong> to monitor
                            packets on the bus
                        </li>
                        <li>
                            Check the class identifier in your annoucement
                            packets
                        </li>
                    </ul>
                </Alert>
            )}
        </>
    )
}