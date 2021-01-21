
import { Badge, Grid, Typography } from "@material-ui/core";
import React from "react";
import { ArcadeGamepadButton, ArcadeGamepadReg } from "../../../../src/jdom/constants";
import { DashboardServiceProps } from "./DashboardServiceWidget";
import { useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import { groupBy } from "../../../../src/jdom/utils";
import Alert from "../ui/Alert";
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
    const { textPrimary, active, background, controlBackground } = useWidgetTheme(color);
    const clickeable = !!host;
    const checked = (pressure || 0) > 0;

    const handleDown = () => host?.down(button, 0xff >> 1);
    const handleUp = () => host?.up(button);

    return <g transform={`translate(${cx},${cy})`}>
        <circle cx={0} cy={0} r={ro} fill={background} />
        <circle tabIndex={0} cx={0} cy={0} r={ri} fill={checked ? active : controlBackground}
            onPointerDown={handleDown}
            onPointerUp={handleUp}
            className={clickeable ? "clickeable" : undefined}
            role={clickeable ? "button" : undefined}>
            <title>{`button ${ArcadeGamepadButton[button]}`}</title>
        </circle>
        <text cx={0} cy={0 + 20} fontSize={20} textAnchor="middle">{ArcadeGamepadButton[button]}</text>
    </g>
}

export default function DashboardArcadeGamepad(props: DashboardServiceProps) {
    const { service, services } = props;
    const [available] = useRegisterUnpackedValue<[[ArcadeGamepadButton][]]>(service.register(ArcadeGamepadReg.AvailableButtons))
    const [pressed] = useRegisterUnpackedValue<[[ArcadeGamepadButton, number][]]>(service.register(ArcadeGamepadReg.Buttons));
    const widgetSize = useWidgetSize(services.length);
    const host = useServiceHost<ArcadeGamepadServiceHost>(service);
    const color = host ? "secondary" : "primary";
    const { textPrimary, background, controlBackground } = useWidgetTheme(color);

    if (!available?.length)
        return null

    const w = 256
    const h = 128
    const ro = 32
    const ri = 30

    const cw = w / 13
    const ch = h / 4

    const pos = {
        [ArcadeGamepadButton.Left]: { cx: cw, cy: 2 * ch },
        [ArcadeGamepadButton.Right]: { cx: cw * 3, cy: 2 * ch },
        [ArcadeGamepadButton.Up]: { cx: cw * 2, cy: ch },
        [ArcadeGamepadButton.Down]: { cx: cw * 2, cy: 3 * ch },

        [ArcadeGamepadButton.A]: { cx: cw * 11, cy: ch },
        [ArcadeGamepadButton.B]: { cx: cw * 9, cy: 3 * ch },

        [ArcadeGamepadButton.Menu]: { cx: cw * 4, cy: ch },
        [ArcadeGamepadButton.MenuAlt]: { cx: cw * 5, cy: ch },
        [ArcadeGamepadButton.Exit]: { cx: cw * 7, cy: ch },
    }

    return <SvgWidget width={w} height={h} size={widgetSize}>
        {available.map(button => <ArcadeButton
            key={button[0]}
            cx={pos[button[0]].cx}
            cy={pos[button[0]].cy}
            ro={ro}
            ri={ri}
            button={button[0]}
            host={host}
            pressure={pressed?.find(p => p[0] === button[0])?.[1] || 0}
            color={color}
        />)}
    </SvgWidget>
}