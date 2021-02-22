import { useEffect, useMemo, useRef, useState } from "react";

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

export function useMicrophoneAnalyzer(enabled: boolean, fftSize?: number, smoothingTimeConstant?: number) {
    const audioContext = useAudioContext(enabled);
    const [analyzer, setAnalyzer] = useState<AnalyserNode>()
    const microphoneSource = useRef<MediaStreamAudioSourceNode>();

    // grab microphone
    useEffect(() => {
        if (!enabled) {
            setAnalyzer(undefined);
        } else {
            console.log(`requesting microphone`)
            try {
                navigator.getUserMedia({
                    video: false,
                    audio: true
                }
                    , resp => {
                        const source = microphoneSource.current = audioContext.createMediaStreamSource(resp);
                        const node = audioContext.createAnalyser()
                        node.fftSize = fftSize || 64;
                        node.smoothingTimeConstant = smoothingTimeConstant || 0.1;
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
        }

        // cleanup
        return () => {
            console.log(`cleaning microphone`)
            microphoneSource.current?.disconnect();
            microphoneSource.current = undefined;
        }
    }, [enabled, fftSize]);

    // 
    return analyzer;
}

export function useMicrophoneVolume(enabled: boolean) {
    const analyzer = useMicrophoneAnalyzer(enabled, 64, 0.001);
    const frequencies = useMemo(() => analyzer && new Uint8Array(analyzer.frequencyBinCount), [analyzer]);

    if (!analyzer) return undefined;
    return () => {
        analyzer?.getByteFrequencyData(frequencies);
        let max = 0;
        const n = frequencies.length;
        for (let i = 0; i < n; ++i)
            max = Math.max(max, frequencies[i]);
        //dubious
        return max / 0xff;
    }
}