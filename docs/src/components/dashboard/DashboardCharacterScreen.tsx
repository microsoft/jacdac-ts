import React from "react";
import { CharacterScreenReg, CharacterScreenTextDirection } from "../../../../src/jdom/constants";
import { DashboardServiceProps } from "./DashboardServiceWidget";
import { useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import useWidgetSize from "../widgets/useWidgetSize";
import SvgWidget from "../widgets/SvgWidget";
import { createStyles, makeStyles } from "@material-ui/core";
import useWidgetTheme from "../widgets/useWidgetTheme";

const useStyles = makeStyles(() => createStyles({
    text: {
        fontFamily: "monospace",
        fontWeight: 100,
    },
    box: {
    }
}));

export default function DashboardCharacterScreen(props: DashboardServiceProps) {
    const { service, services, variant } = props;
    const widgetSize = useWidgetSize(variant, services.length);
    const classes = useStyles();
    const [message] = useRegisterUnpackedValue<[string]>(service.register(CharacterScreenReg.Message));
    const [rows] = useRegisterUnpackedValue<[number]>(service.register(CharacterScreenReg.Rows));
    const [columns] = useRegisterUnpackedValue<[number]>(service.register(CharacterScreenReg.Columns));
    const [textDirection] = useRegisterUnpackedValue<[number]>(service.register(CharacterScreenReg.TextDirection))
    const { textPrimary, background, controlBackground } = useWidgetTheme("primary");

    if (rows === undefined || columns === undefined)
        return null; // size unknown

    const cw = 8
    const ch = 10;
    const m = 1;
    const mo = 2;
    const fs = 8;

    const rtl = textDirection === CharacterScreenTextDirection.RightToLeft;
    const w = columns * (cw + m) - m + 2 * mo;
    const h = rows * (ch + m) - m + 2 * mo;

    const lines = (message || "").split(/\n/g);
    const els: JSX.Element[] = [];

    let y = mo;
    for (let row = 0; row < rows; ++row) {
        let x = mo;
        const line = lines[row];
        for (let column = 0; column < columns; ++column) {
            const char = line?.[rtl ? (columns - 1 - column) : column];
            els.push(<g key={`${row}-${column}`}>
                <rect x={x} y={y} width={cw} height={ch} className={classes.box}
                    fill={controlBackground} />
                {char && <text x={x + cw / 2} y={y + ch - fs / 3} textAnchor="middle" fontSize={fs}
                    className={classes.text} fill={textPrimary}
                    aria-label={char}
                >{char}</text>}
            </g>)
            x += cw + m;
        }

        y += ch + m;
    }
    return <SvgWidget tabIndex={0} title={`character screen displaying "${message}"`} width={w} height={h} size={widgetSize} >
        <>
            <rect x={0} y={0} width={w} height={h} r={m / 2} fill={background} />
            {els}
        </>
    </SvgWidget>
}