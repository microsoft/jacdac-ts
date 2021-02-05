import { Paper } from "@material-ui/core";
import React, { useContext } from "react"
import { serviceName } from "../../../src/jdom/pretty";
import { SensorAggregatorConfig, SensorAggregatorInputConfig } from "../../../src/jdom/sensoraggregatorclient"
import JacdacContext, { JDContextProps } from "../../../src/react/Context"
import DeviceName from "./DeviceName";

function SensorAggregatorInputConfigView(props: { input: SensorAggregatorInputConfig }) {
    const { bus } = useContext<JDContextProps>(JacdacContext);
    const { input } = props;
    const { serviceClass, deviceId, serviceIndex } = input;

    const device = deviceId && bus.device(deviceId)

    return <>
        {serviceName(serviceClass)}
        {device && <DeviceName device={device} serviceIndex={serviceIndex} />}
        {!device && deviceId && <span>{deviceId}[{serviceIndex}]</span>}
        {!deviceId && <span>/ any device</span>}
    </>
}

export default function SensorAggregatorConfigView(props: { config: SensorAggregatorConfig }) {
    const { config } = props;

    if (!config?.inputs)
        return <></>

    return <Paper>
        <ul>
            <li>samples interval (ms): <code>{config.samplingInterval}</code></li>
            <li>samples window (# samples): <code>{config.samplesInWindow}</code></li>
            <li>inputs ({config.inputs.length})
                <ul>
                    {config.inputs.map((input, i) => <li key={"input" + i}><SensorAggregatorInputConfigView input={input} /></li>)}
                </ul>
            </li>
        </ul>
    </Paper>
}