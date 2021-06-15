/**
 * WebPack 5.0+ compatible loader.
 * @returns 
 */
export default function createJacdacWorker() {
    return (
        typeof Window !== "undefined" &&
        new Worker(new URL("../dist/jacdac-worker.js", import.meta.url))
    )
}
