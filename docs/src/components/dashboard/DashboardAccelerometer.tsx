import React from "react";
import { AccelerometerReg } from "../../../../src/jdom/constants";
import { DashboardServiceProps } from "./DashboardServiceWidget";
import { useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import { Canvas, useFrame } from "react-three-fiber"
import { Physics, usePlane, useBox } from '@react-three/cannon'
import { OrbitControls, Plane, RoundedBox, Sky, ContactShadows } from "@react-three/drei"
import useWidgetTheme from "../widgets/useWidgetTheme";
import useServiceHost from "../hooks/useServiceHost";
import SensorServiceHost from "../../../../src/hosts/sensorservicehost";

/*
function Plane(props) {
    const [ref] = usePlane(() => ({ rotation: [-Math.PI / 2, 0, 0], ...props }))
    return (
        <mesh ref={ref} receiveShadow>
            <planeBufferGeometry attach="geometry" args={[1009, 1000]} />
            <shadowMaterial attach="material" color="#171717" />
        </mesh>
    )
}

function Cube(props: { color: string, rotateX: number, rotateY: number, rotateZ: number }) {
    const { color, rotateX } = props;
    const [ref, api] = useBox(() => ({ mass: 1, position: [0, 5, 0], rotation: [0.4, 0.2, 0.5], ...props }))
    // useFrame(({ clock }) => api.rotation.set(Math.sin(clock.getElapsedTime()) * 5, 0, 0))
    return (
        <mesh receiveShadow castShadow ref={ref} rotation-x={rotateX} rotation-y={rotateY} rotate-y={rotateY}>
            <boxBufferGeometry attach="geometry" />
            <meshLambertMaterial attach="material" color={color} />
        </mesh>
    )
}
*/

export default function DashboardAccelerometer(props: DashboardServiceProps) {
    const { service } = props;
    const register = service.register(AccelerometerReg.Forces);
    const forces = useRegisterUnpackedValue<[number, number, number]>(register);
    const host = useServiceHost<SensorServiceHost<[number, number, number]>>(service);
    const color = host ? "secondary" : "primary"
    const { active } = useWidgetTheme(color)

    if (!forces)
        return null;

    const [x, y, z] = forces;
    const roll = Math.atan2(-y, z);
    const pitch = Math.atan(x / (y * y + z * z));

    return <div style={({ height: "20vh", background: "#ccc" })}>
        <Canvas shadowMap camera={{ position: [-1, 2, 2], fov: 50 }}>
            <hemisphereLight intensity={0.35} />
            <spotLight position={[10, 10, 10]} angle={0.3} penumbra={1} intensity={2} castShadow />
            <mesh receiveShadow castShadow rotation-x={roll} rotation-z={pitch}>
                <boxBufferGeometry attach="geometry" />
                <meshLambertMaterial attach="material" color={active} />
            </mesh>
        </Canvas>
    </div>
}