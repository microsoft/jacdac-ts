const TAB_KEY = 9;
const ESC_KEY = 27;
const ENTER_KEY = 13;
const SPACE_KEY = 32;

function keyCodeFromEvent(e: any) {
    return (typeof e.which == "number") ? e.which : e.keyCode;
}

export default function useFireKey(handler: () => void): (e: React.KeyboardEvent<Element>) => void {
    if (!handler)
        return undefined;
    return (e: React.KeyboardEvent<Element>) => {
        const charCode = keyCodeFromEvent(e);
        if (charCode === ENTER_KEY || charCode === SPACE_KEY) {
            e.preventDefault();
            handler();
        }
    }
}
