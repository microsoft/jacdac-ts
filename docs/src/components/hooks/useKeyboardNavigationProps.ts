import useArrowKeys from "./useArrowKeys";

export default function useKeyboardNavigationProps(parentRef: Element, symmetric?: boolean) {
    const query = '[tabindex="0"]';

    const onMove = (offset: number) => () => {
        const focusable = Array.from<SVGElement>(parentRef.querySelectorAll(query));
        if (focusable.length) {
            const me = focusable.findIndex(f => f === document.activeElement);
            const next = ((me + offset) + focusable.length) % focusable.length;
            focusable[next].focus();
        }
    }

    const onKeyDown = useArrowKeys({
        onLeft: onMove(-1),
        onRight: onMove(1),
        symmetric
    });

    return {
        onKeyDown: parentRef && onKeyDown
    }
}