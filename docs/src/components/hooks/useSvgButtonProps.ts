import { SVGProps } from "react";
import useFireKey from "./useFireKey";

export default function useSvgButtonProps<T extends SVGElement>(
    label: string,
    onDown?: () => void,
    onUp?: () => void
): SVGProps<T> {

    const disabled = !onDown && !onUp;
    const fireDownOnEnter = useFireKey(onDown);
    const fireUpOnEnter = useFireKey(onUp);

    return {
        className: disabled ? undefined : "clickeable",
        role: disabled ? undefined : "button",
        tabIndex: disabled ? undefined : 0,
        ["aria-label"]: label,
        onPointerDown: onDown,
        onPointerUp: onUp,
        onPointerLeave: onUp,
        onKeyDown: fireDownOnEnter,
        onKeyUp: fireUpOnEnter
    }
}