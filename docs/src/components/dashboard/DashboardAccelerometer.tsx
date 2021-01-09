
import { createStyles, makeStyles } from "@material-ui/core";
import React from "react";
import { AccelerometerReg } from "../../../../src/jdom/constants";
import { DashboardServiceProps } from "./DashboardServiceView";
import { useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import clsx from 'clsx';
import RegisterInput from "../RegisterInput";
import { scaleFloatToInt, scaleIntToFloat } from "../../../../src/jdom/spec";

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
            margin: `${theme.spacing(MARGIN)}${UNIT} auto`
        },
        cube: {
            width: theme.spacing(CUBE) + UNIT,
            height: theme.spacing(CUBE) + UNIT,
            top: theme.spacing(MARGIN) + UNIT,
            transformStyle: "preserve-3d",
            transform: "rotateX(-22deg) rotateY(-38deg) rotateZ(0deg)",
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
    const roll = Math.atan2(y, z);
    const pitch = Math.atan(-x / (y * Math.sin(roll) + z * Math.cos(roll)));
    const rot = -Math.acos(z);

    //console.log({ x, y, z, roll, pitch, rot })
    return <div className={classes.wrap}>
        <div className={classes.cube}
            style={{
                transform: `rotateX(${roll}rad) rotateY(${pitch}rad) rotateZ(${rot}rad) translateX(0) translateY(0) translateZ(0)`
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
    const { specification } = register;
    const forces = useRegisterUnpackedValue<[number, number, number]>(register);

    return (<>
        { forces && <Cube forces={forces.map((v, i) => scaleIntToFloat(v, specification.fields[i]))} />}
        {expanded && <RegisterInput key={register.id}
            register={register}
            variant={"widget"}
            showServiceName={expanded}
            showRegisterName={true}
            hideMissingValues={!expanded}
            showTrend={expanded}
        />}
    </>)
}