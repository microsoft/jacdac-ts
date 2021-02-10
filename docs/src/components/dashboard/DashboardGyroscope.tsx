import React, { useRef } from "react";
import { GyroscopeReg } from "../../../../src/jdom/constants";
import { DashboardServiceProps } from "./DashboardServiceWidget";
import { useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import { Canvas, useFrame } from "react-three-fiber"
import useWidgetTheme from "../widgets/useWidgetTheme";
import useServiceHost from "../hooks/useServiceHost";
import SensorServiceHost from "../../../../src/hosts/sensorservicehost";
import { JDRegister } from "../../../../src/jdom/register";
import { Mesh } from "three";
import { Grid, Slider } from "@material-ui/core";
import { roundWithPrecision } from "../../../../src/jacdac";
import { Plane } from "@react-three/drei";

function Cube(props: { color: string, register: JDRegister }) {
    const { color, register } = props;
    const meshRef = useRef<Mesh>()

    // updates outside of react
    useFrame((state, delta) => {
        const { current: mesh } = meshRef;
        if (!mesh) return;

        const rates = register.unpackedValue;
        if (!rates) return;

        const [x, y, z] = rates; // degrees
        const degreesToRadians = Math.PI / 180;
        const f = delta * degreesToRadians;
        mesh.rotation.x += x * f;
        mesh.rotation.y += -z * f;
        mesh.rotation.z += -y * f;
    })

    return <mesh ref={meshRef} receiveShadow castShadow>
        <boxBufferGeometry attach="geometry" />
        <meshPhongMaterial attach="material" color={color} />
    </mesh>
}

function CanvasWidget(props: { color: string, register: JDRegister }) {
    return <Canvas shadowMap camera={{ position: [1, 0.5, 2], fov: 50 }}>
        <hemisphereLight intensity={0.35} />
        <spotLight position={[10, 10, 10]} angle={0.3} penumbra={1} intensity={2} castShadow />
        <Plane receiveShadow={true} castShadow={true} args={[5, 5]} position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]} />        <Axis />
        <Cube {...props} />
    </Canvas>
}

function Sliders(props: { host: SensorServiceHost<[number, number, number]>, register: JDRegister }) {
    const { host, register } = props;
    const rates = useRegisterUnpackedValue<[number, number, number]>(register);
    const handleChangeX = (event: unknown, newValue: number | number[]) => {
        const [, y, z] = host.reading.values();
        const n = newValue as any as number;
        host.reading.setValues([n, y, z]);
        register.sendGetAsync()
    }
    const handleChangeY = (event: unknown, newValue: number | number[]) => {
        const [x,, z] = host.reading.values();
        const n = newValue as any as number;
        host.reading.setValues([x, n, z]);
        register.sendGetAsync()
    }
    const handleChangeZ = (event: unknown, newValue: number | number[]) => {
        const [x, y] = host.reading.values();
        const n = newValue as any as number;
        host.reading.setValues([x, y, n]);
        register.sendGetAsync()
    }
    const valueDisplay = (v: number) => `${roundWithPrecision(v, 1)}°/s`

    if (!rates?.length)
        return null;
    const [x, y, z] = rates;
    const step = 1
    return <>
        <Grid item>
            <Slider
                valueLabelDisplay="auto"
                valueLabelFormat={valueDisplay}
                aria-label="x rotation rate slider" orientation="vertical" min={-180} max={180} step={step}
                value={x}
                onChange={handleChangeX} />
        </Grid>
        <Grid item>
            <Slider
                valueLabelDisplay="auto"
                valueLabelFormat={valueDisplay}
                aria-label="y rotation rate slider" orientation="vertical" min={-180} max={180} step={step}
                value={y}
                onChange={handleChangeY} />
        </Grid>
        <Grid item>
            <Slider
                valueLabelDisplay="auto"
                valueLabelFormat={valueDisplay}
                aria-label="z rotation rate slider" orientation="vertical" min={-180} max={180} step={step}
                value={z}
                onChange={handleChangeZ} />
        </Grid>
    </>
}

export default function DashboardGyroscope(props: DashboardServiceProps) {
    const { service } = props;
    const register = service.register(GyroscopeReg.RotationRates);
    const host = useServiceHost<SensorServiceHost<[number, number, number]>>(service);
    const color = host ? "secondary" : "primary"
    const { active } = useWidgetTheme(color)

    return <Grid container direction="row">
        <Grid item style={({ height: "20vh", width: "20vh" })}>
            <CanvasWidget color={active} register={register} />
        </Grid>
        {host && <Sliders host={host} register={register} />}
    </Grid>
}