import React, { SVGProps } from "react";
import { LedMatrixDisplayReg } from "../../../../src/jdom/constants";
import { DashboardServiceProps } from "./DashboardServiceWidget";
import { useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import useWidgetSize from "../widgets/useWidgetSize";
import { SvgWidget } from "../widgets/SvgWidget";
import useWidgetTheme from "../widgets/useWidgetTheme";
import useServiceHost from "../hooks/useServiceHost";
import LEDMatrixDisplayServiceHost from "../../../../src/hosts/ledmatrixdisplayservicehost";
import useFireKey from "../hooks/useFireKey";

export default function DashboardLEDMatrixDisplay(props: DashboardServiceProps) {
    const { service, services } = props;
    const widgetSize = useWidgetSize(services.length);

    const [leds] = useRegisterUnpackedValue<[Uint8Array]>(service.register(LedMatrixDisplayReg.Leds));
    const [brightness] = useRegisterUnpackedValue<[number]>(service.register(LedMatrixDisplayReg.Brightness));
    const [rows] = useRegisterUnpackedValue<[number]>(service.register(LedMatrixDisplayReg.Rows));
    const [columns] = useRegisterUnpackedValue<[number]>(service.register(LedMatrixDisplayReg.Columns));
    const host = useServiceHost<LEDMatrixDisplayServiceHost>(service);
    const color = host ? "secondary" : "primary";
    const { background, controlBackground, active } = useWidgetTheme(color)

    // no data about layout
    if (rows === undefined || columns === undefined)
        return null;

    const enabled = !!leds && brightness > 0;
    const clickeable = !!host;
    // compute size
    const minOpacity = 0.3;
    const pw = 8;
    const ph = 8;
    const ps = 0.5;
    const pr = 2;
    const m = 2;
    const w = columns * pw + (columns + 1) * m;
    const h = rows * ph + (rows + 1) * m;

    const columnspadded = columns + (8 - columns % 8)
    const handleLedClick = (bitindex: number) => () => host.toggle(bitindex);

    // add leds
    const render = () => {
        const boxEls: JSX.Element[] = [];
        const ledEls: JSX.Element[] = [];
        const onFill = enabled ? active : "transparent";
        const onStroke = enabled ? undefined : active;
        const offFill = controlBackground;
        const offStroke = "transparent";
        const ledProps: SVGProps<SVGRectElement> = {
            className: clickeable ? "clickeable" : undefined,
            role: clickeable ? "button" : "",
            tabIndex: clickeable ? 0 : undefined
        }

        let y = m;
        for (let row = 0; row < rows; row++) {
            let x = m;
            for (let col = 0; col < columns; col++) {
                const box = <rect key={`b${row}-${col}`} x={x} y={y} width={pw} height={ph} r={pr}
                    fill={controlBackground} />;
                boxEls.push(box)

                const bitindex = (row * columnspadded) + col;
                const byte = leds?.[bitindex >> 3];
                const bit = bitindex % 8;
                const on = 1 === ((byte >> bit) & 1)
                const handleClick = clickeable ? handleLedClick(bitindex) : undefined
                const fireClick = useFireKey(handleClick);

                ledEls.push(<rect key={`l${row}-${col}`} x={x} y={y} width={pw} height={ph} r={pr}
                    fill={on ? onFill : offFill}
                    stroke={on ? onStroke : offStroke}
                    strokeWidth={ps}
                    {...ledProps}
                    
                    aria-label={`led ${row}, ${col} ${on ? "on" : "off"}`}
                    onKeyDown={fireClick}
                    onClick={handleClick} />);
                x += pw + m;
            }
            y += ph + m;
        }
        return { boxEls, ledEls }
    }

    const { boxEls, ledEls } = render();
    return <SvgWidget width={w} height={h} size={widgetSize}>
        <rect x={0} y={0} width={w} height={h} r={pw} fill={background} />
        {boxEls}
        {ledEls.length && <g opacity={minOpacity + (brightness / 0xff) * (1 - minOpacity)}>
            {ledEls}
        </g>}
    </SvgWidget>
}