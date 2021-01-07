import React, { useContext, useEffect, useRef } from "react";
import { REPORT_RECEIVE } from "../../../src/jdom/constants";
import { JDRegister } from "../../../src/jdom/register";
import JACDACContext, { JDContextProps } from "../../../src/react/Context";
import FieldDataSet from "./FieldDataSet"
import Trend from "./Trend"
import useChartPalette from "./useChartPalette";
import useChange from "../jacdac/useChange"

const DEFAULT_HORIZON = 50
const DEFAULT_HEIGHT = 12

export default function RegisterTrend(props: {
    register: JDRegister,
    showName?: boolean,
    horizon?: number,
    height?: number,
    mini?: boolean
}) {
    const { register, mini, horizon, height } = props;
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const palette = useChartPalette()
    const dataSet = useRef(FieldDataSet.create(bus, [register], "output", palette, 100));

    useChange(dataSet.current);

    // register on change...
    useEffect(() => register.subscribe(REPORT_RECEIVE, () => {
        dataSet.current.addRow();
    }), [register])

    return <Trend dataSet={dataSet.current}
        horizon={horizon || DEFAULT_HORIZON}
        gradient={true}
        height={height || DEFAULT_HEIGHT} mini={mini} />
}