import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { REPORT_UPDATE } from "../../../src/dom/constants";
import { JDRegister } from "../../../src/dom/register";
import JACDACContext, { JDContextProps } from "../../../src/react/Context";
import FieldDataSet from "./FieldDataSet"
import Trend, { TrendProps } from "./Trend"
import useChartPalette from "./useChartPalette";
import useDebounce from "./useDebounce"

export default function RegisterTrend(props: { register: JDRegister, showName?: boolean, mini?: boolean }) {
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const { register, mini } = props;
    const palette = useChartPalette()
    const [dataSet, setDataSet] = useState(FieldDataSet.create(bus, [register], "output", palette, 100));

    const debouncedDataSet = useDebounce(dataSet, 200);

    // register on change...
    useEffect(() => register.subscribe(REPORT_UPDATE, () => {
        dataSet.addRow();
        console.log('add row', dataSet)
        setDataSet(dataSet);
    }), [register])

    return <Trend dataSet={debouncedDataSet} horizon={50} gradient={true} height={12} />
}