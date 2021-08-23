export class Flags {
    /**
     * Enables additional logging and diagnostics
     */
    static diagnostics = false
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

    /**
     * Use local storage and indexeddb to store data
     */
    static storage = false
}
export default Flags