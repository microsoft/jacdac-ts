import React from "react";
import { ButtonReg, SoilMoistureReg } from "../../../../src/jdom/constants";
import ButtonServiceHost from "../../../../src/hosts/buttonservicehost";
import { DashboardServiceProps } from "./DashboardServiceWidget";
import ButtonWidget from "../widgets/ButtonWidget";
import { useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import useWidgetSize from "../widgets/useWidgetSize";
import useServiceHost from "../hooks/useServiceHost";
import { SvgWidget } from "../widgets/SvgWidget";
import useWidgetTheme from "../widgets/useWidgetTheme";
import JDSensorServiceHost from "../../../../src/hosts/sensorservicehost";

export default function DashboardSoilMoisture(props: DashboardServiceProps) {
    const { service, services, variant } = props;
    const [moisture] = useRegisterUnpackedValue<[number]>(service.register(SoilMoistureReg.Moisture));
    const widgetSize = useWidgetSize(variant, services.length);
    const host = useServiceHost<JDSensorServiceHost<[number]>>(service);
    const color = host ? "secondary" : "primary";
    const { active, background, controlBackground, textProps } = useWidgetTheme(color);

    const v = Math.round(moisture * 100);

    const w = 5;
    const h = 9.488;
    return <SvgWidget width={w} height={h} size={widgetSize}>
        <path fill={background} d="M4.812 7.997V.5a.5.5 0 00-.5-.5H.689a.5.5 0 00-.5.5v7.497l.503 1.491h.466l.503-1.491V3.373a.792.792 0 01.84-.791.792.792 0 01.838.79v4.625l.503 1.491h.466z" />
        <path fill={controlBackground} d="M4.075 8.548a.075.075 0 100-.15.075.075 0 100 .15zM4.425 7.281a.075.075 0 100-.15.075.075 0 100 .15zM4.425 5.948a.075.075 0 100-.15.075.075 0 100 .15zM3.725 4.614a.075.075 0 100-.15.075.075 0 100 .15zM3.725 3.948a.075.075 0 100-.15.075.075 0 100 .15zM3.725 5.281a.075.075 0 100-.15.075.075 0 100 .15zM4.425 6.614a.075.075 0 100-.15.075.075 0 100 .15zM4.425 7.948a.075.075 0 100-.15.075.075 0 100 .15zM3.725 7.281a.075.075 0 100-.15.075.075 0 100 .15zM3.725 5.948a.075.075 0 100-.15.075.075 0 100 .15zM4.425 4.614a.075.075 0 100-.15.075.075 0 100 .15zM4.425 3.948a.075.075 0 100-.15.075.075 0 100 .15zM4.425 5.281a.075.075 0 100-.15.075.075 0 100 .15zM3.725 6.614a.075.075 0 100-.15.075.075 0 100 .15zM3.725 7.948a.075.075 0 100-.15.075.075 0 100 .15zM.925 8.548a.075.075 0 100-.15.075.075 0 100 .15zM.575 7.281a.075.075 0 100-.15.075.075 0 100 .15zM.575 5.948a.075.075 0 100-.15.075.075 0 100 .15zM1.275 4.614a.075.075 0 100-.15.075.075 0 100 .15zM1.275 3.948a.075.075 0 100-.15.075.075 0 100 .15zM1.275 5.281a.075.075 0 100-.15.075.075 0 100 .15zM.575 6.614a.075.075 0 100-.15.075.075 0 100 .15zM.575 7.948a.075.075 0 100-.15.075.075 0 100 .15zM1.275 7.281a.075.075 0 100-.15.075.075 0 100 .15zM1.275 5.948a.075.075 0 100-.15.075.075 0 100 .15zM.575 4.614a.075.075 0 100-.15.075.075 0 100 .15zM.575 3.948a.075.075 0 100-.15.075.075 0 100 .15zM.575 5.281a.075.075 0 100-.15.075.075 0 100 .15zM1.275 6.614a.075.075 0 100-.15.075.075 0 100 .15zM1.275 7.948a.075.075 0 100-.15.075.075 0 100 .15z" />
        <text x={w / 2} y="1.768" font-size="1.058" stroke-width=".026" {...textProps}>{v}%</text>
        {host && <path d="M2.5 3.238v4.73" fill="none" stroke="#000" stroke-width=".026" />}
    </SvgWidget>
}