import React, { useRef } from "react";
import { SoilMoistureReg, SoilMoistureVariant } from "../../../../src/jdom/constants";
import { DashboardServiceProps } from "./DashboardServiceWidget";
import { useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import useWidgetSize from "../widgets/useWidgetSize";
import useServiceHost from "../hooks/useServiceHost";
import { SvgWidget } from "../widgets/SvgWidget";
import useWidgetTheme from "../widgets/useWidgetTheme";
import JDSensorServiceHost from "../../../../src/hosts/sensorservicehost";
import SliderHandle from "../widgets/SliderHandle";
import { scaleFloatToInt, scaleIntToFloat } from "../../../../src/jacdac";

export default function DashboardSoilMoisture(props: DashboardServiceProps) {
    const { service, services, variant } = props;
    const pathHandleRef = useRef<SVGPathElement>();
    const moistureReg = service.register(SoilMoistureReg.Moisture);
    const [moisture] = useRegisterUnpackedValue<[number]>(moistureReg);
    const [sensorVariant] = useRegisterUnpackedValue<[SoilMoistureVariant]>(service.register(SoilMoistureReg.Variant));
    const widgetSize = useWidgetSize(variant, services.length);
    const host = useServiceHost<JDSensorServiceHost<[number]>>(service);
    const color = host ? "secondary" : "primary";
    const { active, background, controlBackground, textProps } = useWidgetTheme(color);

    const value = Math.round(scaleIntToFloat(moisture, moistureReg.specification.fields[0]) * 100);
    const hasValue = !isNaN(value);
    const tvalue = hasValue ? `${value}%` : `--`

    const w = 5;
    const h = 9.488;
    const sw = 1;
    const onChange = (value: number) => {
        host?.reading.setValues([scaleFloatToInt(value / 100, moistureReg.specification.fields[0])])
    }

    return <SvgWidget width={w} height={h} size={widgetSize}>
        <path fill={background} d="M4.812 7.997V.5a.5.5 0 00-.5-.5H.689a.5.5 0 00-.5.5v7.497l.503 1.491h.466l.503-1.491V3.373a.792.792 0 01.84-.791.792.792 0 01.838.79v4.625l.503 1.491h.466z" />
        <path fill={controlBackground} d="M4.075 8.548a.075.075 0 100-.15.075.075 0 100 .15zM4.425 7.281a.075.075 0 100-.15.075.075 0 100 .15zM4.425 5.948a.075.075 0 100-.15.075.075 0 100 .15zM3.725 4.614a.075.075 0 100-.15.075.075 0 100 .15zM3.725 3.948a.075.075 0 100-.15.075.075 0 100 .15zM3.725 5.281a.075.075 0 100-.15.075.075 0 100 .15zM4.425 6.614a.075.075 0 100-.15.075.075 0 100 .15zM4.425 7.948a.075.075 0 100-.15.075.075 0 100 .15zM3.725 7.281a.075.075 0 100-.15.075.075 0 100 .15zM3.725 5.948a.075.075 0 100-.15.075.075 0 100 .15zM4.425 4.614a.075.075 0 100-.15.075.075 0 100 .15zM4.425 3.948a.075.075 0 100-.15.075.075 0 100 .15zM4.425 5.281a.075.075 0 100-.15.075.075 0 100 .15zM3.725 6.614a.075.075 0 100-.15.075.075 0 100 .15zM3.725 7.948a.075.075 0 100-.15.075.075 0 100 .15zM.925 8.548a.075.075 0 100-.15.075.075 0 100 .15zM.575 7.281a.075.075 0 100-.15.075.075 0 100 .15zM.575 5.948a.075.075 0 100-.15.075.075 0 100 .15zM1.275 4.614a.075.075 0 100-.15.075.075 0 100 .15zM1.275 3.948a.075.075 0 100-.15.075.075 0 100 .15zM1.275 5.281a.075.075 0 100-.15.075.075 0 100 .15zM.575 6.614a.075.075 0 100-.15.075.075 0 100 .15zM.575 7.948a.075.075 0 100-.15.075.075 0 100 .15zM1.275 7.281a.075.075 0 100-.15.075.075 0 100 .15zM1.275 5.948a.075.075 0 100-.15.075.075 0 100 .15zM.575 4.614a.075.075 0 100-.15.075.075 0 100 .15zM.575 3.948a.075.075 0 100-.15.075.075 0 100 .15zM.575 5.281a.075.075 0 100-.15.075.075 0 100 .15zM1.275 6.614a.075.075 0 100-.15.075.075 0 100 .15zM1.275 7.948a.075.075 0 100-.15.075.075 0 100 .15z" />
        <text x={w / 2} y="1.568" fontSize="1.058" strokeWidth=".026" {...textProps}>{tvalue}</text>
        {host && hasValue && <>
            <path ref={pathHandleRef} d="M2.5 3.238v4.73" fill="none" stroke={background}
                strokeWidth={sw / 4} />
            <SliderHandle pathRef={pathHandleRef.current}
                value={value} valueText={tvalue}
                min={0} max={100} step={5}
                label={`soil moisture slider`}
                r={0}
                fill={controlBackground}
                stroke={active}
                strokeWidth={sw}
                onValueChange={onChange}
            />
        </>}
    </SvgWidget>
}