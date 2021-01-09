
import { createStyles, makeStyles } from "@material-ui/core";
import React from "react";
import { AccelerometerReg } from "../../../../src/jdom/constants";
import { DashboardServiceProps } from "./DashboardServiceView";
import { useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import clsx from 'clsx';
import RegisterInput from "../RegisterInput";

const useStyles = makeStyles(() => createStyles({
    wrap: {
        width: "250px",
        height: "213px",
        margin: "20px auto",
        backgroundColor: "#EEE",
    },
    cube: {
        width: "112px",
        height: "112px",
        top: "50px",
        transformStyle: "preserve-3d",
        transform: "rotateX(-22deg) rotateY(-38deg) rotateZ(0deg)",
        margin: "auto",
        position: "relative",
        transition: "all 0.5s ease-in-out"
    },
    face: {
        position: "absolute",
        transition: "all 0.5s ease-in-out",
        width: "112px",
        height: "112px",
        float: "left",
        overflow: "hidden",
        opacity: "0.85"
    },
    side1: {
        transform: "rotatex(90deg) translateX(0px) translateY(0px) translateZ(56px)",
        backgroundColor: "#FFF"
    },
    side2: {
        transform: "rotateY(-90deg) translateX(0px) translateY(0px) translateZ(56px)",
        backgroundColor: "#ffaf1c"
    },
    side3: {
        transform: "translateX(0px) translateY(0px) translateZ(56px)",
        backgroundColor: "#58d568"
    },
    side4: {
        transform: "rotateY(90deg) translateX(0px) translateY(0px) translateZ(56px)",
        backgroundColor: "#ed3030"
    },
    side5: {
        transform: "rotateY(180deg) translateX(0px) translateY(0px) translateZ(56px)",
        backgroundColor: "#1c5ffe"
    },
    side6: {
        transform: "rotateX(-90deg) translateX(0px) translateY(0px) translateZ(56px)",
        backgroundColor: "#f2f215"
    }
}));


function Cube(props: { x: number, y: number, z: number }) {
    const classes = useStyles();
    const degx = -22;
    const degy = -80;
    const degz = 45;
    return <div className={classes.wrap}>
        <div className={classes.cube}
            style={{
                transform: `rotateX(${degx}deg) rotateY(${degy}deg) rotateZ(${degz}deg) translateX(0) translateY(0) translateZ(0)`
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

    return (<>
        { forces && <Cube x={forces[0]} y={forces[1]} z={forces[2]} />}
        {expanded && <RegisterInput key={register.id}
            register={register}
            variant={"widget"}
            showServiceName={expanded}
            showRegisterName={expanded}
            hideMissingValues={!expanded}
            showTrend={expanded}
        />}
    </>)
}