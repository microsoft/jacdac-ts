import { SVGProps } from "react";

const TAB_KEY = 9;
const ESC_KEY = 27;
const ENTER_KEY = 13;
const SPACE_KEY = 32;

function keyCodeFromEvent(e: any) {
    return (typeof e.which == "number") ? e.which : e.keyCode;
}

export default function useSvgButtonProps<T extends SVGElement>(
    label: string,
    onDown: () => void,
    onUp: () => void,
    disabled?: boolean
): SVGProps<T> {

    const fireDownOnEnter = (e: React.KeyboardEvent<SVGElement>) => {
        const charCode = keyCodeFromEvent(e);
        if (charCode === ENTER_KEY || charCode === SPACE_KEY) {
            e.preventDefault();
            onDown();
        }
    }
    const fireUpOnEnter = (e: React.KeyboardEvent<SVGElement>) => {
        const charCode = keyCodeFromEvent(e);
        if (charCode === ENTER_KEY || charCode === SPACE_KEY) {
            e.preventDefault();
            onUp();
        }
    }

    return {
        className: disabled ? undefined : "clickeable",
        role: disabled ? undefined : "button",
        tabIndex: disabled ? undefined : 0,
        ["aria-label"]: label,
        onPointerDown: onDown,
        onPointerUp: onUp,
        onKeyDown: fireDownOnEnter,
        onKeyUp: fireUpOnEnter
    }
}