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

export interface AudioAnalyzerOptions {
    fftSize?: number;
    smoothingTimeConstant?: number;
    minDecibels?: number;
    maxDecibels?: number;
}

export function useMicrophoneAnalyzer(enabled: boolean, options?: AudioAnalyzerOptions) {
    const { fftSize, smoothingTimeConstant, minDecibels, maxDecibels } = options || {};
    const audioContext = useAudioContext(enabled);
    const [analyzer, setAnalyzer] = useState<AnalyserNode>()
    const microphoneSource = useRef<MediaStreamAudioSourceNode>();

    // grab microphone
    useEffect(() => {
        if (!enabled) {
            setAnalyzer(undefined);
        } else {
            try {
                navigator.getUserMedia({
                    video: false,
                    audio: true
                }
                    , resp => {
                        const source = microphoneSource.current = audioContext.createMediaStreamSource(resp);
                        const node = audioContext.createAnalyser()
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
            microphoneSource.current?.disconnect();
            microphoneSource.current = undefined;
        }
    }, [enabled]);

    // update options
    useEffect(() => {
        if (analyzer) {
            if (!isNaN(fftSize))
                analyzer.fftSize = fftSize;
            if (!isNaN(smoothingTimeConstant))
                analyzer.smoothingTimeConstant = smoothingTimeConstant;
            if (!isNaN(minDecibels))
                analyzer.minDecibels = minDecibels;
            if (!isNaN(maxDecibels))
                analyzer.maxDecibels = maxDecibels;
        }
    }, [analyzer, fftSize, smoothingTimeConstant, minDecibels, maxDecibels])

    return analyzer;
}

export function useMicrophoneVolume(enabled: boolean, options?: AudioAnalyzerOptions) {
    const analyzer = useMicrophoneAnalyzer(enabled, options);
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