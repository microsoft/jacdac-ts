import { useEffect, useMemo, useState } from "react";

function useAudioContext(enabled: boolean) {
    const context = useMemo<AudioContext>(() => {
        if (!enabled)
            return undefined;
        try {
            return new AudioContext();
        } catch (e) {
            return undefined;
        }
    }, [enabled]);
    useEffect(() => () => context?.close(), [enabled])
    return context;
}

export function useMicrophoneAnalyzer(enabled: boolean, fftSize?: number) {
    const audioContext = useAudioContext(enabled);
    const [analyzer, setAnalyzer] = useState<AnalyserNode>()

    // grab microphone
    useEffect(() => {
        if (!enabled) {
            setAnalyzer(undefined);
            return;
        }

        try {
            navigator.getUserMedia({
                video: false,
                audio: true
            }
                , resp => {
                    const source = audioContext.createMediaStreamSource(resp);
                    const node = audioContext.createAnalyser()
                    node.fftSize = fftSize || 64;
                    source.connect(node);
                    setAnalyzer(node);
                }
                , err => {
                    console.warn(err);
                    setAnalyzer(undefined)
                });
        } catch (e) {
            console.warn(e)
        }
    }, [enabled]);

    // 
    return analyzer;
}

export function useMicrophoneVolume(enabled: boolean) {
    const analyzer = useMicrophoneAnalyzer(enabled, 64);
    const frequencies = useMemo(() => analyzer && new Uint8Array(analyzer.frequencyBinCount), [analyzer]);

    if (!analyzer) return () => 0;
    return () => {
        analyzer?.getByteFrequencyData(frequencies);
        let sum = 0;
        const n = frequencies.length;
        for (let i = 0; i < n; ++i)
            sum += frequencies[i];
        //dubious
        return analyzer.minDecibels
            + (sum / (0xff * n) * (analyzer.maxDecibels - analyzer.minDecibels));
    }
}