import React, { useRef } from "react";
import { AccelerometerReg } from "../../../../src/jdom/constants";
import { DashboardServiceProps } from "./DashboardServiceWidget";
import { useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import { Canvas, useFrame } from "react-three-fiber"
import useWidgetTheme from "../widgets/useWidgetTheme";
import useServiceHost from "../hooks/useServiceHost";
import SensorServiceHost from "../../../../src/hosts/sensorservicehost";
import { JDRegister } from "../../../../src/jdom/register";
import { Mesh } from "three";
import { Grid, Slider, Mark } from "@material-ui/core";
import { roundWithPrecision } from "../../../../src/jacdac";
import { Line, Plane, OrbitControls } from "@react-three/drei";

function lerp(v0: number, v1: number, t: number) {
    return v0 * (1 - t) + v1 * t
}

function Axis(props: {}) {
    const lineProps = {
        lineWidth: 4,                 // In pixels (default)
        dashed: false                // Default
    };
    const c = 1;
    return <>
        <Line
            points={[[0, 0, 0], [c, 0, 0]]}       // Array of points
            color="blue"
            {...lineProps}
        />
        <Line
            points={[[0, 0, 0], [0, c, 0]]}       // Array of points
            color="red"
            {...lineProps}
        />
        <Line
            points={[[0, 0, 0], [0, 0, c]]}       // Array of points
            color="black"
            {...lineProps}
        />
    </>
}

function Cube(props: { color: string, register: JDRegister }) {
    const { color, register } = props;
    const meshRef = useRef<Mesh>()

    // updates outside of react
    useFrame(() => {
        const { current: mesh } = meshRef;
        if (!mesh) return;

        const forces = register.unpackedValue;
        if (!forces) return;

        const [x, y, z] = forces;
        const roll = Math.atan2(-y, z);
        const pitch = Math.atan(x / (y * y + z * z));

        mesh.rotation.x = lerp(mesh.rotation.x, roll, 0.1)
        mesh.rotation.z = lerp(mesh.rotation.z, pitch, 0.1);
    })

    return <mesh ref={meshRef} receiveShadow castShadow>
        <boxBufferGeometry attach="geometry" />
        <meshPhongMaterial attach="material" color={color} />
    </mesh>
}

function CanvasWidget(props: { color: string, register: JDRegister }) {
    return <Canvas shadowMap camera={{ position: [-1, 0.5, 2], fov: 50 }}>
        <hemisphereLight intensity={0.35} />
        <spotLight position={[10, 10, 10]} angle={0.3} penumbra={1} intensity={2} castShadow />
        <Plane receiveShadow={true} castShadow={true} args={[5, 5]} position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]} />
        <Axis />
        <Cube {...props} />
        <OrbitControls />
    </Canvas>
}

function Sliders(props: { host: SensorServiceHost<[number, number, number]>, register: JDRegister }) {
    const { host, register } = props;
    const forces = useRegisterUnpackedValue<[number, number, number]>(register);
    const handleChangeX = (event: unknown, newValue: number | number[]) => {
        const [x, y, z] = host.reading.values();
        const n = newValue as any as number;
        const nz = -Math.sqrt(1 - (n * n + y * y));
        host.reading.setValues([n, y, nz]);
        register.sendGetAsync()
    }
    const handleChangeY = (event: unknown, newValue: number | number[]) => {
        const [x, y, z] = host.reading.values();
        const n = newValue as any as number;
        const nz = -Math.sqrt(1 - (x * x + n * n));
        host.reading.setValues([x, n, nz]);
        register.sendGetAsync()
    }
    const valueDisplay = (v: number) => roundWithPrecision(v, 1)

    if (!forces?.length)
        return null;
    const [x, y] = forces;
    const min = -2
    const max = 2
    const step = 0.1
    const marks: Mark[] = [
        {
            value: 0,
        },
        {
            value: -1,
        },
        {
            value: 1,
        }
    ]
    return <>
        <Grid item>
            <Slider
                valueLabelDisplay="auto"
                valueLabelFormat={valueDisplay}
                aria-label="x" orientation="vertical" min={min} max={max} step={step}
                value={x}
                onChange={handleChangeX}
                marks={marks}
            />
        </Grid>
        <Grid item>
            <Slider
                valueLabelDisplay="auto"
                valueLabelFormat={valueDisplay}
                aria-label="y" orientation="vertical" min={min} max={max} step={step}
                value={y}
                onChange={handleChangeY}
                marks={marks}
            />
        </Grid>
    </>
}

export default function DashboardAccelerometer(props: DashboardServiceProps) {
    const { service } = props;
    const register = service.register(AccelerometerReg.Forces);
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