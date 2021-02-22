import { useMemo, useRef, useState } from "react";
import { AudioAnalyzerOptions, useMicrophoneAnalyzer } from "./useAudioAnalyzer";

export function useMicrophoneVolume(enabled: boolean, options?: AudioAnalyzerOptions) {
    const analyzer = useMicrophoneAnalyzer(enabled, options);
    const frequencies = useRef(new Uint8Array(0));

    if (!analyzer) return undefined;
    return () => {
        if (frequencies.current.length !== analyzer.frequencyBinCount)
            frequencies.current = new Uint8Array(analyzer.frequencyBinCount);
        analyzer?.getByteFrequencyData(frequencies.current);
        let max = 0;
        const bins = frequencies.current;
        const n = bins.length;
        for (let i = 0; i < n; ++i)
            max = Math.max(max, bins[i]);
        return max / 0xff;
    }
}