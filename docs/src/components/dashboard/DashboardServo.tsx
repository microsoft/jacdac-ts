
import { Grid } from "@material-ui/core";
import React from "react";
import { ButtonReg, ServoReg } from "../../../../src/jdom/constants";
import ButtonServiceHost from "../../../../src/hosts/buttonservicehost";
import { DashboardServiceProps } from "./DashboardServiceWidget";
import ButtonWidget from "../widgets/ButtonWidget";
import { useRegisterIntValue, useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import useWidgetSize from "../widgets/useWidgetSize";
import useServiceHost from "../hooks/useServiceHost";
import { SvgWidget } from "../widgets/SvgWidget";

export default function DashboardServo(props: DashboardServiceProps) {
    const { service, expanded } = props;

    const register = service.register(ServoReg.Pulse);
    const value = useRegisterIntValue(register);

    const cx = 56.661;
    const cy = 899.475;

    const angle = (value - 2500) / (2000) * 180;

//    const dt = Math.min(now - this.lastAngleTime, 50) / 1000;
//    const delta = this.targetAngle - this.currentAngle;
//    this.currentAngle += Math.min(Math.abs(delta), SPEED * dt) * (delta > 0 ? 1 : -1);

    const transform = `translate(0 -752.688) rotate(${angle}, ${cx}, ${cy})`;

    return <SvgWidget width={112.188} height={299.674} size={"5em"}>
        <g id="layer1" stroke-linecap="round" stroke-linejoin="round" transform="scale(0.8)">
            <path id="path8212" fill="#0061ff" stroke-width="6.6" d="M.378 44.61v255.064h112.188V44.61H.378z" />
            <path id="crankbase" fill="#00f" stroke-width="6.6" d="M56.57 88.047C25.328 88.047 0 113.373 0 144.615c.02 22.352 11.807 42.596 32.238 51.66.03 3.318.095 5.24.088 7.938 0 13.947 11.307 25.254 25.254 25.254 13.947 0 25.254-11.307 25.254-25.254-.006-2.986-.415-5.442-.32-8.746 19.487-9.45 30.606-29.195 30.625-50.852 0-31.24-25.33-56.568-56.57-56.568z" />
            <path id="lowertip" fill="#00a2ff" stroke-width="2" d="M.476 260.78v38.894h53.82v-10.486a6.82 6.566 0 0 1-4.545-6.182 6.82 6.566 0 0 1 6.82-6.566 6.82 6.566 0 0 1 6.82 6.566 6.82 6.566 0 0 1-4.545 6.182v10.486h53.82V260.78H.475z" />
            <path id="uppertip" fill="#00a2ff" stroke-width="2" d="M112.566 83.503V44.61h-53.82v10.487a6.82 6.566 0 0 1 4.544 6.18 6.82 6.566 0 0 1-6.818 6.568 6.82 6.566 0 0 1-6.82-6.567 6.82 6.566 0 0 1 4.546-6.18V44.61H.378v38.893h112.188z" />
            <path id="VCC" fill="red" stroke-width="2" d="M53.72 21.93h5.504v22.627H53.72z" />
            <path id="LOGIC" fill="#fc0" stroke-width="2" d="M47.3 21.93h5.503v22.627H47.3z" />
            <path id="GND" fill="#a02c2c" stroke-width="2" d="M60.14 21.93h5.505v22.627H60.14z" />
            <path id="connector" stroke-width="2" d="M45.064 0a1.488 1.488 0 0 0-1.488 1.488v24.5a1.488 1.488 0 0 0 1.488 1.487h22.71a1.488 1.488 0 0 0 1.49-1.488v-24.5A1.488 1.488 0 0 0 67.774 0h-22.71z" />
            <g id="crank" transform={transform}>
                <path id="arm" fill="#ececec" stroke="#000" stroke-width="1.372" d="M47.767 880.88c-4.447 1.162-8.412 8.278-8.412 18.492s3.77 18.312 8.412 18.494c8.024.314 78.496 5.06 78.51-16.952.012-22.013-74.377-21.117-78.51-20.035z" />
                <circle id="path8216" cx="56.661" cy="899.475" r="8.972" fill="gray" stroke-width="2" />
            </g>
        </g>
    </SvgWidget>;
}