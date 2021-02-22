import { useEffect, useMemo } from "react";

export default function useAudioContext(enabled: boolean) {
    const context = useMemo<AudioContext>(() => {
        if (!enabled)
            return undefined;
        try {
            const AudioContext = typeof window !== "undefined"
                && (window.AudioContext
                    || (window as any).webkitAudioContext);
            return AudioContext ? new AudioContext() : undefined;
        } catch (e) {
            return undefined;
        }
    }, [enabled]);
    useEffect(() => () => context?.close(), [enabled])
    return context;
}
