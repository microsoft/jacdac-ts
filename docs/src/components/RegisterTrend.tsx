import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { REPORT_UPDATE } from "../../../src/jdom/constants";
import { JDRegister } from "../../../src/jdom/register";
import JACDACContext, { JDContextProps } from "../../../src/react/Context";
import FieldDataSet from "./FieldDataSet"
import Trend, { TrendProps } from "./Trend"
import useChartPalette from "./useChartPalette";
import useChange from "../jacdac/useChange"

export default function RegisterTrend(props: { register: JDRegister, showName?: boolean, mini?: boolean }) {
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const { register, mini } = props;
    const palette = useChartPalette()
    const [dataSet] = useState(FieldDataSet.create(bus, [register], "output", palette, 100));

    useChange(dataSet);

    // register on change...
    useEffect(() => register.subscribe(REPORT_UPDATE, () => {
        dataSet.addRow();
    }), [register])

    return <Trend dataSet={dataSet} horizon={50} gradient={true} height={12} mini={mini} />
}