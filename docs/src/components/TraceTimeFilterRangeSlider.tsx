import React, { useContext, useEffect, useState } from 'react';
import PacketsContext from "./PacketsContext"
import { Box, Slider, useTheme } from "@material-ui/core"
import useDebounce from './useDebounce';
import { prettyDuration } from '../../../src/dom/pretty';

export default function TraceTimeFilterRangeSlider() {
    const { trace, paused, timeRange, setTimeRange } = useContext(PacketsContext)
    const [minMax, setMinMax] = useState([0, 1000]);
    const [value, setValue] = useState<number[]>([timeRange.after || 0, timeRange.before || 1000])
    const [min, max] = minMax;
    const theme = useTheme();
    const debouncedValue = useDebounce(value, 500);

    const handleChange = (event, newValue) => {
        setValue(newValue);
    };

    useEffect(() => {
        const mintime = trace.packets[0]?.timestamp || 0;
        const maxtime = trace.packets[trace.packets.length - 1]?.timestamp || 1000;
        // update range
        setMinMax([mintime, maxtime]);
    }, [trace, paused])

    useEffect(() => {
        setTimeRange({ after: debouncedValue[0], before: debouncedValue[1] })
    }, [debouncedValue])

    return <Box display="flex" pl={theme.spacing(0.5)} pr={theme.spacing(0.5)}>
        <Slider
            min={minMax[0]}
            max={minMax[1]}
            value={value}
            onChange={handleChange}
            valueLabelDisplay="auto"
            getAriaValueText={prettyDuration}
            valueLabelFormat={prettyDuration}
        />
    </Box>
}