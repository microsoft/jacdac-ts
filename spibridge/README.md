# SPI<->Jacdac bridge; RPi side

The executable in this folder talks via SPI to a STM32G0 MCU that handles real-time Jacdac communications.
The packets are read from stdin and then printed out to stdout, so it should be easy to interface node.js to it.

This is an early prototype.

## RPi Zero USB

https://www.thepolyglotdeveloper.com/2016/06/connect-raspberry-pi-zero-usb-cable-ssh/
https://www.thepolyglotdeveloper.com/2019/07/share-internet-between-macos-raspberry-pi-zero-over-usb/

## Install node.js

```bash
wget https://nodejs.org/download/release/v10.24.1/node-v10.24.1-linux-armv6l.tar.xz
tar -xf node-v10.24.1-linux-armv6l.tar.xz
cd node-v10.24.1-linux-armv6l
sudo cp -r bin include lib share /usr/local
```

node from nodejs package from raspbian takes ~16s to startup (!!!)

install:
* git


## SPI

enable SPI from `sudo raspi-config`

