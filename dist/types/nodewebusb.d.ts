/// <reference types="w3c-web-usb" />
declare const webusb: any;
declare const usb: any;
/**
 * Node.JS webusb bindings. Make sure to add "webusb" to your package.json config.
 * @param options
 */
declare function requestDevice(options: USBDeviceRequestOptions): any;
