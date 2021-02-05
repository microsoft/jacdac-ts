import React, { SVGProps, useRef } from "react";
import { MatrixKeypadReg } from "../../../../src/jdom/constants";
import { DashboardServiceProps } from "./DashboardServiceWidget";
import { useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import useWidgetSize from "../widgets/useWidgetSize";
import SvgWidget from "../widgets/SvgWidget";
import useWidgetTheme from "../widgets/useWidgetTheme";
import useServiceHost from "../hooks/useServiceHost";
import useFireKey from "../hooks/useFireKey";
import useKeyboardNavigationProps from "../hooks/useKeyboardNavigationProps";
import MatrixKeypadServiceHost from "../../../../src/hosts/matrixkeypadservicehost";

export default function DashboardMatrixKeypad(props: DashboardServiceProps) {
    const { service, services, variant } = props;
    const widgetSize = useWidgetSize(variant, services.length);

    const widgetRef = useRef<SVGGElement>();
    const pressedRegister = service.register(MatrixKeypadReg.Pressed);
    const [pressed] = useRegisterUnpackedValue<[([number])[]]>(pressedRegister);
    const [labels] = useRegisterUnpackedValue<[([string])[]]>(service.register(MatrixKeypadReg.Labels));
    const [rows] = useRegisterUnpackedValue<[number]>(service.register(MatrixKeypadReg.Rows));
    const [columns] = useRegisterUnpackedValue<[number]>(service.register(MatrixKeypadReg.Columns));
    const host = useServiceHost<MatrixKeypadServiceHost>(service);
    const color = host ? "secondary" : "primary";
    const { background, controlBackground, active, textProps } = useWidgetTheme(color)

    // no data about layout
    if (rows === undefined || columns === undefined)
        return null;

    const clickeable = !!host;
    // compute size
    const pw = 8;
    const ph = 8;
    const ps = 0.5;
    const pr = 1;
    const m = 2;
    const w = columns * pw + (columns + 1) * m;
    const h = rows * ph + (rows + 1) * m;

    const handleButtonUp = (index: number) => () => {
        host.up(index);
        pressedRegister.refresh();
    }
    const handleButtonDown = (index: number) => () => {
        host.down(index);
        pressedRegister.refresh();
    }

    // add leds
    const render = () => {
        const ledEls: JSX.Element[] = [];
        const ledProps: SVGProps<SVGRectElement> = {
            className: clickeable ? "clickeable" : undefined,
            role: clickeable ? "button" : "",
            tabIndex: clickeable ? 0 : undefined
        }

        let y = m;
        for (let row = 0; row < rows; row++) {
            let x = m;
            for (let col = 0; col < columns; col++) {
                const index = row * columns + col;
                const on = pressed?.findIndex(p => p[0] === index) > -1;
                const label = labels?.[index]?.[0]

                const handleUp = clickeable ? handleButtonUp(index) : undefined
                const handleDown = clickeable ? handleButtonDown(index) : undefined
                const fireUp = useFireKey(handleUp);
                const fireDown = useFireKey(handleDown);

                ledEls.push(<rect key={`l${row}-${col}`} x={x} y={y} width={pw} height={ph} rx={pr} ry={pr}
                    fill={on ? active : controlBackground}
                    stroke={"none"}
                    strokeWidth={ps}
                    {...ledProps}
                    aria-label={label || `key ${row},${col}`}
                    onKeyDown={fireDown}
                    onKeyUp={fireUp}
                    onPointerDown={handleDown}
                    onPointerUp={handleUp}
                />);
                if (label) {
                    ledEls.push(<text key={`t${row}-${col}`} fontSize={ph * 2 /3} {...textProps} x={x + pw / 2} y={y + ph / 2}>{label}</text>)
                }
                x += pw + m;
            }
            y += ph + m;
        }
        return { ledEls }
    }

    const { ledEls } = render();
    const navProps = useKeyboardNavigationProps(widgetRef.current)
    return <SvgWidget width={w} height={h} size={widgetSize}>
        <rect x={0} y={0} width={w} height={h} rx={pr} ry={pr} fill={background} />
        <g ref={widgetRef} {...navProps}>
            {ledEls}
        </g>
    </SvgWidget>
}