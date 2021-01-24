export function svgPointerPoint(svg: SVGSVGElement, event: React.PointerEvent): DOMPoint {
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const res = point.matrixTransform(svg.getScreenCTM().inverse());
    return res;
}

export function closestPoint(pathNode: SVGPathElement, step: number, point: DOMPoint): number {
    const pathLength = pathNode.getTotalLength()

    const distance2 = (p: DOMPoint) => {
        const dx = p.x - point.x
        const dy = p.y - point.y;
        return dx * dx + dy * dy;
    }

    let bestLength: number = 0;
    let bestDistance = Infinity;
    for (let scanLength = 0; scanLength <= pathLength; scanLength += step) {
        const scan = pathNode.getPointAtLength(scanLength);
        const scanDistance = distance2(scan);
        if (scanDistance < bestDistance) {
            bestLength = scanLength;
            bestDistance = scanDistance;
        }
    }
    return bestLength / pathLength;
}