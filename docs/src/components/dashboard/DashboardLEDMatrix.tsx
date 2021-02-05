import React, { SVGProps, useRef } from "react";
import { LEDMatrixReg } from "../../../../src/jdom/constants";
import { DashboardServiceProps } from "./DashboardServiceWidget";
import { useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import useWidgetSize from "../widgets/useWidgetSize";
import SvgWidget from "../widgets/SvgWidget";
import useWidgetTheme from "../widgets/useWidgetTheme";
import useServiceHost from "../hooks/useServiceHost";
import useFireKey from "../hooks/useFireKey";
import useKeyboardNavigationProps from "../hooks/useKeyboardNavigationProps";
import { toggle } from "../../../../src/hosts/ledmatrixservicehost";

export default function DashboardLEDMatrixDisplay(props: DashboardServiceProps) {
    const { service, services, variant } = props;
    const widgetSize = useWidgetSize(variant, services.length);

    const widgetRef = useRef<SVGGElement>();
    const ledsRegister = service.register(LEDMatrixReg.Leds);
    const [leds] = useRegisterUnpackedValue<[Uint8Array]>(ledsRegister);
    const [brightness] = useRegisterUnpackedValue<[number]>(service.register(LEDMatrixReg.Brightness));
    const [rows] = useRegisterUnpackedValue<[number]>(service.register(LEDMatrixReg.Rows));
    const [columns] = useRegisterUnpackedValue<[number]>(service.register(LEDMatrixReg.Columns));
    const host = useServiceHost(service);
    const color = host ? "secondary" : "primary";
    const { background, controlBackground, active } = useWidgetTheme(color)

    // no data about layout
    if (rows === undefined || columns === undefined)
        return null;

    const enabled = !!leds && brightness > 0;
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
    const handleLedClick = (bitindex: number) => (ev: React.PointerEvent<SVGRectElement>) => {
        if (ev && !ev.buttons) return;
        const newLeds = leds.slice(0);
        toggle(newLeds, bitindex);
        ledsRegister.sendSetAsync(newLeds, true)
    }

    // add leds
    const render = () => {
        const boxEls: JSX.Element[] = [];
        const ledEls: JSX.Element[] = [];
        const onFill = enabled ? active : "transparent";
        const onStroke = enabled ? undefined : active;
        const offFill = controlBackground;
        const offStroke = "transparent";
        const ledProps: SVGProps<SVGRectElement> = {
            className: "clickeable",
            role: "button",
            tabIndex: 0
        }

        let y = m;
        for (let row = 0; row < rows; row++) {
            let x = m;
            for (let col = 0; col < columns; col++) {
                const box = <rect key={`b${row}-${col}`} x={x} y={y} width={pw} height={ph} rx={pr} ry={pr}
                    fill={controlBackground} />;
                boxEls.push(box)

                const bitindex = (row * columnspadded) + col;
                const byte = leds?.[bitindex >> 3];
                const bit = bitindex % 8;
                const on = 1 === ((byte >> bit) & 1)
                const handleClick = handleLedClick(bitindex)
                const fireClick = useFireKey(handleClick);

                ledEls.push(<rect key={`l${row}-${col}`} x={x} y={y} width={pw} height={ph} rx={pr} ry={pr}
                    fill={on ? onFill : offFill}
                    stroke={on ? onStroke : offStroke}
                    strokeWidth={ps}
                    {...ledProps}
                    aria-label={`led ${row}, ${col} ${on ? "on" : "off"}`}
                    onPointerDown={handleClick}
                    onPointerEnter={handleClick}
                    onKeyDown={fireClick}
                />);
                x += pw + m;
            }
            y += ph + m;
        }
        return { boxEls, ledEls }
    }

    const { boxEls, ledEls } = render();
    const navProps = useKeyboardNavigationProps(widgetRef.current)
    return <SvgWidget width={w} height={h} size={widgetSize}>
        <rect x={0} y={0} width={w} height={h} rx={2} ry={2} fill={background} />
        <g ref={widgetRef} {...navProps}>
            {boxEls}
            {ledEls.length && <g opacity={minOpacity + brightness * (1 - minOpacity)}>
                {ledEls}
            </g>}
        </g>
    </SvgWidget>
}