
import React, { useEffect, useRef } from "react";
import { LightReg, LightVariant, RENDER } from "../../../../src/jdom/constants";
import useServiceHost from "../hooks/useServiceHost";
import LightServiceHost from "../../../../src/hosts/lightservicehost";
import { SvgWidget } from "../widgets/SvgWidget";
import useWidgetTheme from "../widgets/useWidgetTheme";
import useWidgetSize from "../widgets/useWidgetSize";
import { JDService } from "../../../../src/jdom/service";
import { useRegisterUnpackedValue } from "../../jacdac/useRegisterValue"

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

export default function LightWidget(props: { service: JDService, widgetCount?: number }) {
    const { service, widgetCount } = props;
    const { background, controlBackground } = useWidgetTheme()
    const widgetSize = useWidgetSize(widgetCount)
    const [numPixels] = useRegisterUnpackedValue<[number]>(service.register(LightReg.NumPixels));
    const [variant] = useRegisterUnpackedValue<[number]>(service.register(LightReg.Variant));
    const [actualBrightness] = useRegisterUnpackedValue<[number]>(service.register(LightReg.ActualBrightness));
    const pathRef = useRef<SVGPathElement>(undefined)
    const pixelsRef = useRef<SVGGElement>(undefined);
    const host = useServiceHost<LightServiceHost>(service);

    const neoradius = 6;
    const neocircleradius = neoradius + 1;
    const sw = neoradius * 2;

    // paint svg via dom
    const render = () => {
        const pixels = pixelsRef.current?.children;
        const colors = host?.colors;
        if (!colors || !pixels)
            return;

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
        const pixels = pixelsRef.current?.children;
        if (!p || !pixels)
            return;

        const pn = pixels.length;
        const length = p.getTotalLength();
        const extra = variant === LightVariant.Ring ? 0 : 1;
        const step = length / pn;

        for (let i = 0; i < pn; ++i) {
            const pixel = pixels.item(i) as SVGCircleElement;
            const point = p.getPointAtLength(step * (i + extra / 2.0));
            pixel.setAttribute("cx", "" + point.x);
            pixel.setAttribute("cy", "" + point.y);
        }

        render();
    }, [variant, numPixels])

    // render when new colors are in
    useEffect(() => host?.subscribe(RENDER, render), [host]);

    // not enough data to draw anything
    if (numPixels === undefined || actualBrightness === undefined)
        return null;

    let width: number;
    let height: number;

    let d = "";
    if (variant === LightVariant.Stick) {
        const dx = neoradius * 3
        d = `M 0 ${dx}`
        for (let i = 0; i < numPixels; ++i) {
            d += ` h ${dx} 0`
        }
        width = numPixels * dx;
        height = 2 * dx;
    }
    else if (variant === LightVariant.Strip) {
        const side = Math.ceil(Math.sqrt(numPixels) * 1.6108)

        let i = 0;
        let dir = 1
        const dx = neoradius * 3
        const tr = neoradius * 6

        let line = 1;
        d = `M ${2 * tr} ${dx}`
        while (i < numPixels) {
            d += ` h ${dx * dir}`;
            if ((i % side) === side - 1) {
                // turn around
                d += ` c ${tr * dir} 0, ${tr * dir} ${tr}, 0 ${tr}`
                dir = -dir;
                line++;
            }
            i++;
        }

        width = side * dx + 4 * tr;
        height = line * tr + 2 * dx;
    }
    else {
        const neoperimeter = numPixels * (2.2 * neoradius)
        const ringradius = neoperimeter / (2 * Math.PI)
        const margin = 2 * neoradius;
        width = 2 * (margin + ringradius);
        height = width;
        const wm = width - 2 * margin;
        //if (variant === LightVariant.Ring)
        d = `M ${margin},${height >> 1} a ${ringradius},${ringradius} 0 1,0 ${wm},0 a ${ringradius},${ringradius} 0 1,0 -${wm},0`
    }

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
                >
                    <title>pixel {i}</title>
                </circle>)}
            </g>
        </>
    </SvgWidget>
}
