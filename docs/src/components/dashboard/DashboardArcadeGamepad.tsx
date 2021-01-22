
import React from "react";
import { ArcadeGamepadButton, ArcadeGamepadReg } from "../../../../src/jdom/constants";
import { DashboardServiceProps } from "./DashboardServiceWidget";
import { useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import { SvgWidget } from "../widgets/SvgWidget";
import useWidgetSize from "../widgets/useWidgetSize";
import useServiceHost from "../hooks/useServiceHost";
import useWidgetTheme from "../widgets/useWidgetTheme";
import ArcadeGamepadServiceHost from "../../../../src/hosts/arcadegamepadservicehost";

function ArcadeButton(props: {
    cx: number,
    cy: number,
    ro: number,
    ri: number,
    pressure: number,
    button: ArcadeGamepadButton,
    host: ArcadeGamepadServiceHost,
    color?: "primary" | "secondary"
}) {
    const { cx, cy, ro, color, pressure, ri, button, host } = props;
    const { textProps, active, background, controlBackground } = useWidgetTheme(color);
    const clickeable = !!host;
    const checked = (pressure || 0) > 0;
    const title = ArcadeGamepadButton[button]
    const label = title[0]

    const handleDown = () => host?.down(button, 0xff >> 1);
    const handleUp = () => host?.up(button);

    return <g transform={`translate(${cx},${cy})`}>
        <title>
            {`button ${title} ${checked ? "down" : "up"}`}
        </title>
        <circle cx={0} cy={0} r={ro} fill={background} />
        <circle tabIndex={0} cx={0} cy={0} r={ri}
            fill={checked ? active : controlBackground}
            onPointerDown={handleDown}
            onPointerUp={handleUp}
            className={clickeable ? "clickeable" : undefined}
            role={clickeable ? "button" : undefined}>
            <title>{`button ${ArcadeGamepadButton[button]}`}</title>
        </circle>
        <text cx={0} cy={0} fontSize={ri} {...textProps}>{label}</text>
    </g>
}

export default function DashboardArcadeGamepad(props: DashboardServiceProps) {
    const { service, services } = props;
    const [available] = useRegisterUnpackedValue<[[ArcadeGamepadButton][]]>(service.register(ArcadeGamepadReg.AvailableButtons))
    const [pressed] = useRegisterUnpackedValue<[[ArcadeGamepadButton, number][]]>(service.register(ArcadeGamepadReg.Buttons));
    const widgetSize = useWidgetSize(services.length);
    const host = useServiceHost<ArcadeGamepadServiceHost>(service);
    const color = host ? "secondary" : "primary";

    if (!available?.length)
        return null

    const w = 256
    const h = 128

    const cw = w / 12
    const ch = h / 4

    const ro = cw - 2
    const ri = ro - 4

    const sro = ro - 10
    const sri = sro - 2
    const scy = sro

    const pos = {
        [ArcadeGamepadButton.Left]: { cx: cw * 1.5, cy: 2 * ch, small: false },
        [ArcadeGamepadButton.Right]: { cx: cw * 4.5, cy: 2 * ch, small: false },
        [ArcadeGamepadButton.Up]: { cx: cw * 3, cy: ch, small: false },
        [ArcadeGamepadButton.Down]: { cx: cw * 3, cy: 3 * ch, small: false },

        [ArcadeGamepadButton.A]: { cx: cw * 10.5, cy: ch * 1.25, small: false },
        [ArcadeGamepadButton.B]: { cx: cw * 9.5, cy: ch * 2.75, small: false },

        [ArcadeGamepadButton.Menu]: { cx: cw * 6, cy: scy, small: true },
        [ArcadeGamepadButton.Select]: { cx: cw * 7, cy: scy, small: true },
        [ArcadeGamepadButton.Exit]: { cx: cw * 8, cy: scy, small: true },
        [ArcadeGamepadButton.Reset]: { cx: cw * 9, cy: scy, small: true },
    }

    return <SvgWidget width={w} height={h} size={widgetSize}>
        {available.map(button => ({ button: button[0], pos: pos[button[0]] }))
            .map(({ button, pos }) => <ArcadeButton
                key={button}
                cx={pos.cx}
                cy={pos.cy}
                ro={pos.small ? sro : ro}
                ri={pos.small ? sri : ri}
                button={button}
                host={host}
                pressure={pressed?.find(p => p[0] === button)?.[1] || 0}
                color={color}
            />)}
    </SvgWidget>
}