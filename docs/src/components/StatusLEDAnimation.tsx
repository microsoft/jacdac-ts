import React from "react";
import { statusAnimation } from "./devices/useDeviceStatusLightStyle";
import useLedAnimationStyle from "./hooks/useLedAnimationStyle";
import SvgWidget from "./widgets/SvgWidget"
import Helmet from "react-helmet"
import useWidgetTheme from "./widgets/useWidgetTheme";

export default function StatusLEDAnimation(props: { status: "startup" | "identify" | "connected" | "disconnected" | "panic" | "bootloader" }) {
    const { status } = props;

    const frames = statusAnimation(status);
    const { helmetStyle, className } = useLedAnimationStyle(frames, { cssProperty: "fill" });
    const { controlBackground } = useWidgetTheme();

    const w = 32;
    return <h2>
        <Helmet>
            <style>{helmetStyle}</style>
        </Helmet>
        <SvgWidget width={32 + 12} height={32} size={"1em"}>
            <circle cx={w >> 1} cy={w >> 1} r={(w >> 1) - 1} fill={controlBackground} />
            <circle cx={w >> 1} cy={w >> 1} r={(w >> 1) - 1} className={className} stroke={controlBackground} strokeWidth={1} />
        </SvgWidget>
        {status}
    </h2>
}