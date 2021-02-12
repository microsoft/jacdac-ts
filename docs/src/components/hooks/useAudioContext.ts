import { useEffect, useRef, useState } from "react";

const VOLUME_GAIN = 0.5;

export function useAudioContext(defaultVolume?: number) {
    const contextRef = useRef<AudioContext>();
    const volumeRef = useRef<GainNode>();
    const volume = volumeRef.current?.gain.value;

    useEffect(() => {
        const ctx = contextRef.current = new AudioContext();

        // play silence sound within onlick to unlock it
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start();

        // output node with volume
        const volumeNode = volumeRef.current = ctx.createGain();
        volumeNode.connect(ctx.destination);
        volumeNode.gain.value = (defaultVolume !== undefined ? defaultVolume : 0.2) * VOLUME_GAIN;

        console.log(`new audio context`)
        // cleanup
        return () => {
            console.log('closing audio context')
            ctx.close();
        }
    }, [])

    const setVolume = (v: number) => {
        console.log("setvolumne", v)
        if (volumeRef.current && !isNaN(v)) {
            volumeRef.current.gain.value = v * VOLUME_GAIN;
        }
    }

    const playTone = (frequency: number, duration: number) => {
        if (!contextRef.current) return;
        try {
            const tone = contextRef.current.createOscillator();
            tone.type = "sawtooth";
            tone.connect(volumeRef.current);
            tone.frequency.value = frequency; // update frequency
            tone.start(); // start and stop
            tone.stop(contextRef.current.currentTime + duration / 1000);
        }
        catch (e) {
            console.log(e)
        }
    }

    return {
        volume: volume,
        setVolume,
        playTone
    }
}