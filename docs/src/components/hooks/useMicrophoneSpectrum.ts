import { useRef } from "react";
import { AudioAnalyzerOptions, useMicrophoneAnalyzer } from "./useAudioAnalyzer";

export default function useMicrophoneSpectrum(enabled: boolean, options?: AudioAnalyzerOptions): () => Uint8Array {
    const analyzer = useMicrophoneAnalyzer(enabled, options);
    const frequencies = useRef(new Uint8Array(0));

    if (!analyzer) return undefined;
    return () => {
        if (frequencies.current.length !== analyzer.frequencyBinCount)
            frequencies.current = new Uint8Array(analyzer.frequencyBinCount);
        analyzer?.getByteFrequencyData(frequencies.current);
        return frequencies.current;
    }
}