import { useEffect, useMemo, useState } from "react";

function useAudioContext() {
    const context = useMemo<AudioContext>(() => {
        try {
            return new AudioContext();
        } catch (e) {
            return undefined;
        }
    }, []);
    useEffect(() => () => context?.close(), [])
    return context;
}

export function useMicrophoneAnalyzer(fftSize?: number) {
    const audioContext = useAudioContext();
    const [analyzer, setAnalyzer] = useState<AnalyserNode>()

    // grab microphone
    useEffect(() => {
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
    }, []);

    // 
    return analyzer;
}

export function useMicrophoneVolume() {
    const analyzer = useMicrophoneAnalyzer(64);
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