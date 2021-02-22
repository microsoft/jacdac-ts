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
            // must be multiple of power of two
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
