
import { createStyles, Grid, makeStyles, Typography } from "@material-ui/core";
import React from "react";
import { AccelerometerReg } from "../../../../src/jdom/constants";
import { DashboardServiceProps } from "./DashboardServiceWidget";
import { useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import clsx from 'clsx';
import RegisterInput from "../RegisterInput";
import { roundWithPrecision } from "../../../../src/jdom/utils";

const WRAP = 2
const MARGIN = 0.25
const CUBE = WRAP - MARGIN * 2;
const SIDE = CUBE / 2;
const UNIT = "vh";
const useStyles = makeStyles((theme) => {
    return createStyles({
        wrap: {
            width: theme.spacing(WRAP) + UNIT,
            height: theme.spacing(WRAP) + UNIT,
        },
        cube: {
            width: theme.spacing(CUBE) + UNIT,
            height: theme.spacing(CUBE) + UNIT,
            top: theme.spacing(MARGIN) + UNIT,
            transformStyle: "preserve-3d",
            transform: "rotateX(0deg) rotateY(0deg) rotateZ(0deg)",
            margin: "auto",
            position: "relative",
            transition: "all 0.05s ease-in-out"
        },
        face: {
            position: "absolute",
            transition: "all 0.05s ease-in-out",
            width: theme.spacing(CUBE) + UNIT,
            height: theme.spacing(CUBE) + UNIT,
            float: "left",
            overflow: "hidden",
            opacity: "1"
        },
        side1: {
            transform: `rotatex(90deg) translateX(0px) translateY(0px) translateZ(${theme.spacing(SIDE)}${UNIT})`,
            backgroundColor: "#FFF"
        },
        side2: {
            transform: `rotateY(-90deg) translateX(0px) translateY(0px) translateZ(${theme.spacing(SIDE)}${UNIT})`,
            backgroundColor: "#ffaf1c"
        },
        side3: {
            transform: `translateX(0px) translateY(0px) translateZ(${theme.spacing(SIDE)}${UNIT})`,
            backgroundColor: "#58d568"
        },
        side4: {
            transform: `rotateY(90deg) translateX(0px) translateY(0px) translateZ(${theme.spacing(SIDE)}${UNIT})`,
            backgroundColor: "#ed3030"
        },
        side5: {
            transform: `rotateY(180deg) translateX(0px) translateY(0px) translateZ(${theme.spacing(SIDE)}${UNIT})`,
            backgroundColor: "#1c5ffe"
        },
        side6: {
            transform: `rotateX(-90deg) translateX(0px) translateY(0px) translateZ(${theme.spacing(SIDE)}${UNIT})`,
            backgroundColor: "#f2f215"
        }
    })
});


function Cube(props: { forces: number[] }) {
    const { forces } = props;
    const [x, y, z] = forces;
    const classes = useStyles();
    let roll = Math.atan2(-y, z);
    if (roll < 0)
        roll += 2 * Math.PI;
    let pitch = Math.atan(x / (y * y + z * z));
    const yaw = 0;
    return <div className={classes.wrap}>
        <div className={classes.cube}
            style={{
                transform: `rotateX(${roll}rad) rotateY(${yaw}rad) rotateZ(${pitch}rad) translateX(0) translateY(0) translateZ(0)`
            }}>
            <div className={clsx(classes.face, classes.side1)}></div>
            <div className={clsx(classes.face, classes.side2)}></div>
            <div className={clsx(classes.face, classes.side3)}></div>
            <div className={clsx(classes.face, classes.side4)}></div>
            <div className={clsx(classes.face, classes.side5)}></div>
            <div className={clsx(classes.face, classes.side6)}></div>
        </div>
    </div>;
}

export default function DashboardAccelerometer(props: DashboardServiceProps) {
    const { service, expanded } = props;
    const register = service.register(AccelerometerReg.Forces);
    const forces = useRegisterUnpackedValue<[number, number, number]>(register);

    if (!forces)
        return null;

    return <Cube forces={forces} />
}