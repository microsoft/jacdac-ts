
import React, { useEffect, useRef } from "react";
import { LightVariant, RENDER } from "../../../../src/jdom/constants";
import { DashboardServiceProps } from "./DashboardServiceWidget";
// tslint:disable-next-line: no-submodule-imports match-default-export-name
// tslint:disable-next-line: no-submodule-imports match-default-export-name
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import useServiceHost from "../hooks/useServiceHost";
import LightServiceHost from "../../../../src/hosts/lightservicehost";
import { SvgWidget } from "../widgets/SvgWidget";
import useChange from "../../jacdac/useChange";
import useWidgetTheme from "../widgets/useWidgetTheme";
import useWidgetSize from "../widgets/useWidgetSize";
import { roundWithPrecision } from "../../../../src/jdom/utils";

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    const [r$, g$, b$] = [r / 255, g / 255, b / 255];
    let cMin = Math.min(r$, g$, b$);
    let cMax = Math.max(r$, g$, b$);
    let cDelta = cMax - cMin;
    let h: number;
    let s: number;
    let l: number;
    let maxAndMin = cMax + cMin;

    //lum
    l = (maxAndMin / 2) * 100

    if (cDelta === 0)
        s = h = 0;
    else {
        //hue
        if (cMax === r$)
            h = 60 * (((g$ - b$) / cDelta) % 6);
        else if (cMax === g$)
            h = 60 * (((b$ - r$) / cDelta) + 2);
        else if (cMax === b$)
            h = 60 * (((r$ - g$) / cDelta) + 4);

        //sat
        if (l > 50)
            s = 100 * (cDelta / (2 - maxAndMin));
        else
            s = 100 * (cDelta / maxAndMin);
    }

    return [Math.floor(h), Math.floor(s), Math.floor(l)];
}

function setRgb(el: SVGElement, r: number, g: number, b: number, radius: number) {
    const hsl = rgbToHsl(r, g, b);
    const [h, s, l] = hsl;
    // at least 70% luminosity
    const lum = Math.max(l, 60);
    const fill = `hsl(${h}, ${s}%, ${lum}%)`;
    el.setAttribute("fill", fill);
    const nr = radius * (1 + (l - 60) / 200);
    el.setAttribute("r", "" + nr);
}

export default function LightWidget(props: DashboardServiceProps) {
    const { service } = props;
    const host = useServiceHost<LightServiceHost>(service);
    const { background, controlBackground } = useWidgetTheme()
    const widgetSize = useWidgetSize()
    const [numPixels] = useChange(host.numPixels, r => r.values<[number]>());
    const [variant] = useChange(host.variant, r => r.values<[LightVariant]>());
    const [actualBrightness] = useChange(host.actualBrightness, r => r.values<[number]>());
    const pathRef = useRef<SVGPathElement>(undefined)
    const pixelsRef = useRef<SVGGElement>(undefined);

    const neoradius = 6;
    const neoperimeter = numPixels * (3 * neoradius)
    const ringradius = neoperimeter / (2 * Math.PI)
    const margin = 2 * neoradius;
    const width = 2 * (margin + ringradius);
    const height = width;
    const neocircleradius = neoradius + 1;
    const sw = margin;
    const wm = width - 2 * margin;
    let d = "";
    //if (variant === LightVariant.Ring)
    d = `M ${margin},${height >> 1} a ${ringradius},${ringradius} 0 1,0 ${wm},0 a ${ringradius},${ringradius} 0 1,0 -${wm},0`

    // paint svg via dom
    const render = () => {
        const colors = host.colors;
        const pixels = pixelsRef.current.children;
        const pn = Math.min(pixels.length, colors.length / 3);
        let ci = 0;
        for (let i = 0; i < pn; ++i) {
            const pixel = pixels.item(i) as SVGCircleElement;
            setRgb(pixel, colors[ci], colors[ci + 1], colors[ci + 2], neocircleradius);
            ci += 3;
        }
    }

    // reposition pixels along the path
    useEffect(() => {
        const p = pathRef.current;
        const pixels = pixelsRef.current.children;
        const pn = pixels.length;
        const length = p.getTotalLength();
        const extra = variant === LightVariant.Ring ? 0 : 1;
        const step = length / (pn + extra);

        for (let i = 0; i < pn; ++i) {
            const pixel = pixels.item(i) as SVGCircleElement;
            const point = p.getPointAtLength(step * (i + (extra >> 1)));
            pixel.setAttribute("cx", "" + point.x);
            pixel.setAttribute("cy", "" + point.y);
        }

        render();
    }, [variant, numPixels])

    // render when new colors are in
    useEffect(() => host.subscribe(RENDER, render), [host]);

    // tune opacity to account for global opacity
    const alpha = 0.7;
    const opacity = alpha + (1 - alpha) * (actualBrightness / 0xff);

    return <SvgWidget width={width} height={height} size={widgetSize}>
        <>
            <path ref={pathRef} d={d} fill="transparent" stroke={background} strokeWidth={sw} />
            <g ref={pixelsRef} opacity={opacity}>
                {Array(numPixels).fill(0).map((_, i) => <circle key={"pixel" + i}
                    r={neocircleradius}
                    cx={width >> 1} cy={height >> 1}
                    stroke={controlBackground}
                    strokeWidth={1}
                />)}
            </g>
        </>
    </SvgWidget>
}
