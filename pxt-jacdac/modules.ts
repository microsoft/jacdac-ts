namespace modules {
    /**
     * Runs the identify animation on the current device.
     * @param role 
    */
    //% blockId=jacdacselfidentify block="identify"
    //% group="Services"
    export function identify() {
        jacdac.start();
        jacdac.onIdentifyRequest();
    }
}