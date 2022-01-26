/**
 * Various flags to control the runtime environment
 * @category Runtime
 */
export class Flags {
    /**
     * Enables additional logging and diagnostics
     */
    static diagnostics = false
    /**
     * Trace who and what generates packets
     */
    static trace = false
    /**
     * Enables/disabled WebUSB
     */
    static webUSB = true
    /**
     * Enables/disabled WebSerial
     */
    static webSerial = true

    /**
     * Enables/disables WebBLE
     */
    static webBluetooth = false
}
