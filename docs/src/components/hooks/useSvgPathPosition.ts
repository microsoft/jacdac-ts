import { useEffect, useState } from "react";

export default function usePathPosition(pathRef: SVGPathElement, ratio: number) {
    const [position, setPosition] = useState<[number, number]>();
    useEffect(() => {
        if (pathRef) {
            const length = pathRef.getTotalLength();
            const nratio = Math.max(0, Math.min(1, ratio));
            const distance = pathRef.getTotalLength() * nratio;
            const pos = pathRef.getPointAtLength(distance)
            console.log({ length, nratio, distance, pos })
            setPosition([pos.x, pos.y]);
        }
    }, [pathRef, ratio]);
    return position;
}