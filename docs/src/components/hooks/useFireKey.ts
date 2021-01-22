import React, { KeyboardEvent } from "react"

const ENTER_KEY = 13;
const SPACE_KEY = 32;

export function keyCodeFromEvent(e: any) {
    return (typeof e.which == "number") ? e.which : e.keyCode;
}

export default function useFireKey(handler: () => void): (e: KeyboardEvent<Element>) => void {
    if (!handler)
        return undefined;
    return (e: KeyboardEvent<Element>) => {
        const charCode = keyCodeFromEvent(e);
        if (charCode === ENTER_KEY || charCode === SPACE_KEY) {
            e.preventDefault();
            handler();
        }
    }
}
