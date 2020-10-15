import React, { useContext, useEffect, useState } from 'react';
import PacketsContext from "./PacketsContext"
import { Slider } from "@material-ui/core"
import { PACKET_PROCESS } from '../../../src/dom/constants';
import JACDACContext, { JDContextProps } from '../../../src/react/Context';

export default function TraceTimeFilterRangeSlider() {
    const { bus } = useContext<JDContextProps>(JACDACContext);
    const { filter, setFilter, trace } = useContext(PacketsContext)
    const [minMax, setMinMax] = useState([0, 1000]);
    const [value, setValue] = useState([0, 1000]);

    const handleChange = (event, newValue) => {
        setValue(newValue);
    };

    useEffect(() => bus.subscribe(PACKET_PROCESS, () => {
        const mintime = trace.packets[0]?.timestamp || 0;
        const maxtime = trace.packets[trace.packets.length - 1]?.timestamp || 1000;
        if (mintime === minMax[0] && maxtime === minMax[1])
            return; // no change

        const newMinMax = [mintime, maxtime]
        setValue([mintime + (maxtime - mintime) / 3, mintime + (maxtime - mintime) * 2 / 3,])
        // update range
        setMinMax(newMinMax);
    }), [trace])

    return <Slider
        min={minMax[0]}
        max={minMax[1]}
        value={value}
        onChange={handleChange}
        valueLabelDisplay="auto"
    />
}