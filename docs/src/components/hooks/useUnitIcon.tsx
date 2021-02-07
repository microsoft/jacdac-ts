import React from "react";
import HumidityIcon from "../icons/HumidityIcon"
import { resolveUnit} from "../../../../jacdac-spec/spectool/jdspec"

export default (unit: string) => {
    const { unit: runit } = resolveUnit(unit) || {};
    switch (runit) {
        case "%RH": return <HumidityIcon />;
        default: return null;
    }
}