/// <reference path="spec.d.ts" />

import { NumberFormat } from "./buffer";

export const serviceSpecifications: jdspec.SMap<jdspec.ServiceSpec> = {
    "_base": {
        "name": "Common registers and commands",
        "extends": [],
        "notes": {
            "short": "Service specification will always list explicitly registers and commands defined here.\nThey can be listed with say `@ intensity` instead of `@ 0x01`.",
            "commands": "Commands are subdivided as follows:\n* Commands `0x000-0x07f` - common to all services\n* Commands `0x080-0xeff` - defined per-service\n* Commands `0xf00-0xfff` - reserved for implementation\n\nCommands follow.",
            "registers": "Register are subdivided as follows:\n* Registers `0x001-0x07f` - r/w common to all services\n* Registers `0x080-0x0ff` - r/w defined per-service\n* Registers `0x100-0x17f` - r/o common to all services\n* Registers `0x180-0x1ff` - r/o defined per-service\n* Registers `0x200-0xeff` - custom, defined per-service\n* Registers `0xf00-0xfff` - reserved for implementation, should not be seen on the wire\n\nThe types listed are typical. Check spec for particular service for exact type,\nand a service-specific name for a register (eg. `value` could be `pulse_length`).\nAll registers default to `0` unless otherwise indicated."
        },
        "classIdentifier": 0,
        "enums": {},
        "packets": {
            "announce": {
                "kind": "command",
                "name": "announce",
                "identifier": 0,
                "description": "Enumeration data for control service; service-specific advertisement data otherwise.\nControl broadcasts it automatically every 500ms, but other service have to be queried to provide it.",
                "fields": []
            },
            "report:announce": {
                "kind": "report",
                "name": "announce",
                "identifier": 0,
                "description": "Enumeration data for control service; service-specific advertisement data otherwise.\nControl broadcasts it automatically every 500ms, but other service have to be queried to provide it.",
                "fields": []
            },
            "get_register": {
                "kind": "command",
                "name": "get_register",
                "identifier": 4096,
                "description": "Registers number `N` is fetched by issuing command `0x1000 | N`.\nThe report format is the same as the format of the register.",
                "fields": []
            },
            "report:get_register": {
                "kind": "report",
                "name": "get_register",
                "identifier": 4096,
                "description": "Registers number `N` is fetched by issuing command `0x1000 | N`.\nThe report format is the same as the format of the register.",
                "fields": []
            },
            "set_register": {
                "kind": "command",
                "name": "set_register",
                "identifier": 8192,
                "description": "Registers number `N` is set by issuing command `0x2000 | N`, with the format\nthe same as the format of the register.",
                "fields": []
            },
            "report:event": {
                "kind": "report",
                "name": "event",
                "identifier": 1,
                "description": "Event from sensor or a broadcast service. ",
                "fields": [
                    {
                        "name": "event_id",
                        "unit": "",
                        "type": "u32",
                        "storage": "u32"
                    },
                    {
                        "name": "event_argument",
                        "unit": "",
                        "type": "u32",
                        "storage": "u32"
                    }
                ]
            },
            "calibrate": {
                "kind": "command",
                "name": "calibrate",
                "identifier": 2,
                "description": "Request to calibrate a sensor. The report indicates the calibration is done.",
                "fields": []
            },
            "report:calibrate": {
                "kind": "report",
                "name": "calibrate",
                "identifier": 2,
                "description": "Request to calibrate a sensor. The report indicates the calibration is done.",
                "fields": []
            },
            "description": {
                "kind": "command",
                "name": "description",
                "identifier": 3,
                "description": "Request human-readable description of service.",
                "fields": []
            },
            "report:description": {
                "kind": "report",
                "name": "description",
                "identifier": 3,
                "description": "Request human-readable description of service.",
                "fields": [
                    {
                        "name": "text",
                        "unit": "",
                        "type": "string",
                        "storage": "bytes"
                    }
                ]
            },
            "intensity": {
                "kind": "rw",
                "name": "intensity",
                "identifier": 1,
                "description": "This is either binary on/off (0 or non-zero), or can be gradual (eg. brightness of an RGB LED strip).",
                "fields": [
                    {
                        "name": "_",
                        "unit": "",
                        "type": "u32",
                        "storage": "u32"
                    }
                ]
            },
            "value": {
                "kind": "rw",
                "name": "value",
                "identifier": 2,
                "description": "The primary value of actuator (eg. servo pulse length, or motor duty cycle).",
                "fields": [
                    {
                        "name": "_",
                        "unit": "",
                        "type": "i32",
                        "storage": "i32"
                    }
                ]
            },
            "max_power": {
                "kind": "rw",
                "name": "max_power",
                "identifier": 7,
                "description": "Limit the power drawn by the service, in mA.",
                "fields": [
                    {
                        "name": "_",
                        "unit": "mA",
                        "type": "u16",
                        "storage": "u16",
                        "defaultValue": 500
                    }
                ]
            },
            "is_streaming": {
                "kind": "rw",
                "name": "is_streaming",
                "identifier": 3,
                "description": "Enables/disables broadcast streaming",
                "fields": [
                    {
                        "name": "_",
                        "unit": "",
                        "type": "bool",
                        "storage": "u8"
                    }
                ]
            },
            "streaming_interval": {
                "kind": "rw",
                "name": "streaming_interval",
                "identifier": 4,
                "description": "Period between packets of data when streaming in milliseconds.",
                "fields": [
                    {
                        "name": "_",
                        "unit": "ms",
                        "type": "u32",
                        "storage": "u32",
                        "defaultValue": 100
                    }
                ]
            },
            "reading": {
                "kind": "ro",
                "name": "reading",
                "identifier": 257,
                "description": "Read-only value of the sensor, also reported in streaming.",
                "fields": [
                    {
                        "name": "_",
                        "unit": "",
                        "type": "i32",
                        "storage": "i32"
                    }
                ]
            },
            "low_threshold": {
                "kind": "rw",
                "name": "low_threshold",
                "identifier": 5,
                "description": "Thresholds for event generation for event generation for analog sensors.",
                "fields": [
                    {
                        "name": "_",
                        "unit": "",
                        "type": "i32",
                        "storage": "i32"
                    }
                ]
            },
            "high_threshold": {
                "kind": "rw",
                "name": "high_threshold",
                "identifier": 5,
                "description": "Thresholds for event generation for event generation for analog sensors.",
                "fields": [
                    {
                        "name": "_",
                        "unit": "",
                        "type": "i32",
                        "storage": "i32"
                    }
                ]
            }
        }
    },
    "_sensor": {
        "name": "Sensor",
        "extends": [],
        "notes": {
            "short": "Base class for sensors."
        },
        "classIdentifier": 0,
        "enums": {},
        "packets": {
            "is_streaming": {
                "kind": "rw",
                "name": "is_streaming",
                "identifier": 3,
                "description": "Enables/disables broadcast streaming",
                "fields": [
                    {
                        "name": "_",
                        "unit": "",
                        "type": "bool",
                        "storage": "u8"
                    }
                ]
            },
            "streaming_interval": {
                "kind": "rw",
                "name": "streaming_interval",
                "identifier": 4,
                "description": "Period between packets of data when streaming in milliseconds.",
                "fields": [
                    {
                        "name": "_",
                        "unit": "ms",
                        "type": "u32",
                        "storage": "u32",
                        "defaultValue": 100
                    }
                ]
            }
        }
    },
    "accelerometer": {
        "name": "Button",
        "extends": [],
        "notes": {
            "short": "Base class for sensors.\nA 3-axis accelerometer.",
            "events": "All events are debounced."
        },
        "classIdentifier": 521405449,
        "enums": {},
        "packets": {
            "is_streaming": {
                "kind": "rw",
                "name": "is_streaming",
                "identifier": 3,
                "description": "Enables/disables broadcast streaming",
                "fields": [
                    {
                        "name": "_",
                        "unit": "",
                        "type": "bool",
                        "storage": "u8"
                    }
                ]
            },
            "streaming_interval": {
                "kind": "rw",
                "name": "streaming_interval",
                "identifier": 4,
                "description": "Period between packets of data when streaming in milliseconds.",
                "fields": [
                    {
                        "name": "_",
                        "unit": "ms",
                        "type": "u32",
                        "storage": "u32",
                        "defaultValue": 100
                    }
                ]
            },
            "forces": {
                "kind": "ro",
                "name": "forces",
                "identifier": 257,
                "description": "Indicates the current forces acting on accelerometer.",
                "fields": [
                    {
                        "name": "x",
                        "unit": "g",
                        "shift": 10,
                        "type": "i6.10",
                        "storage": "i16"
                    },
                    {
                        "name": "y",
                        "unit": "g",
                        "shift": 10,
                        "type": "i6.10",
                        "storage": "i16"
                    },
                    {
                        "name": "z",
                        "unit": "g",
                        "shift": 10,
                        "type": "i6.10",
                        "storage": "i16"
                    }
                ]
            },
            "tilt_up": {
                "kind": "event",
                "name": "tilt_up",
                "identifier": 1,
                "description": "Emitted when accelerometer is tilted in the given direction.",
                "fields": []
            },
            "tilt_down": {
                "kind": "event",
                "name": "tilt_down",
                "identifier": 2,
                "description": "Emitted when accelerometer is tilted in the given direction.",
                "fields": []
            },
            "tilt_left": {
                "kind": "event",
                "name": "tilt_left",
                "identifier": 3,
                "description": "Emitted when accelerometer is tilted in the given direction.",
                "fields": []
            },
            "tilt_right": {
                "kind": "event",
                "name": "tilt_right",
                "identifier": 4,
                "description": "Emitted when accelerometer is tilted in the given direction.",
                "fields": []
            },
            "face_up": {
                "kind": "event",
                "name": "face_up",
                "identifier": 5,
                "description": "Emitted when accelerometer is laying flat in the given direction.",
                "fields": []
            },
            "face_down": {
                "kind": "event",
                "name": "face_down",
                "identifier": 6,
                "description": "Emitted when accelerometer is laying flat in the given direction.",
                "fields": []
            },
            "freefall": {
                "kind": "event",
                "name": "freefall",
                "identifier": 7,
                "description": "Emitted when total force acting on accelerometer is much less than 1g.",
                "fields": []
            },
            "shake": {
                "kind": "event",
                "name": "shake",
                "identifier": 11,
                "description": "Emitted when forces change violently a few times.",
                "fields": []
            },
            "force_2g": {
                "kind": "event",
                "name": "force_2g",
                "identifier": 12,
                "description": "Emitted when force in any direction exceeds given threshold.",
                "fields": []
            },
            "force_3g": {
                "kind": "event",
                "name": "force_3g",
                "identifier": 8,
                "description": "Emitted when force in any direction exceeds given threshold.",
                "fields": []
            },
            "force_6g": {
                "kind": "event",
                "name": "force_6g",
                "identifier": 9,
                "description": "Emitted when force in any direction exceeds given threshold.",
                "fields": []
            },
            "force_8g": {
                "kind": "event",
                "name": "force_8g",
                "identifier": 10,
                "description": "Emitted when force in any direction exceeds given threshold.",
                "fields": []
            }
        }
    },
    "button": {
        "name": "Button",
        "extends": [],
        "notes": {
            "short": "Base class for sensors.\nA simple push-button.\n\nNote: this service will stream readings while the button is pressed and shortly after it's released, even\nwhen `is_streaming == 0`. TODO remove this?"
        },
        "classIdentifier": 343122531,
        "enums": {},
        "packets": {
            "is_streaming": {
                "kind": "rw",
                "name": "is_streaming",
                "identifier": 3,
                "description": "Enables/disables broadcast streaming",
                "fields": [
                    {
                        "name": "_",
                        "unit": "",
                        "type": "bool",
                        "storage": "u8"
                    }
                ]
            },
            "streaming_interval": {
                "kind": "rw",
                "name": "streaming_interval",
                "identifier": 4,
                "description": "Period between packets of data when streaming in milliseconds.",
                "fields": [
                    {
                        "name": "_",
                        "unit": "ms",
                        "type": "u32",
                        "storage": "u32",
                        "defaultValue": 100
                    }
                ]
            },
            "pressed": {
                "kind": "ro",
                "name": "pressed",
                "identifier": 257,
                "description": "Indicates whether the button is currently active (pressed).",
                "fields": [
                    {
                        "name": "_",
                        "unit": "",
                        "type": "bool",
                        "storage": "u8"
                    }
                ]
            },
            "down": {
                "kind": "event",
                "name": "down",
                "identifier": 1,
                "description": "Emitted when button goes from inactive (`pressed == 0`) to active.",
                "fields": []
            },
            "up": {
                "kind": "event",
                "name": "up",
                "identifier": 2,
                "description": "Emitted when button goes from active (`pressed == 1`) to inactive.",
                "fields": []
            },
            "click": {
                "kind": "event",
                "name": "click",
                "identifier": 3,
                "description": "Emitted together with `up` when the press time was not longer than 500ms.",
                "fields": []
            },
            "long_click": {
                "kind": "event",
                "name": "long_click",
                "identifier": 4,
                "description": "Emitted together with `up` when the press time was more than 500ms.",
                "fields": []
            }
        }
    },
    "control": {
        "name": "Control",
        "extends": [],
        "notes": {
            "short": "Control service is always service number `0`.\nIt handles actions common to all services on a device."
        },
        "classIdentifier": 0,
        "enums": {},
        "packets": {
            "noop": {
                "kind": "command",
                "name": "noop",
                "identifier": 128,
                "description": "Do nothing. Always ignored. Can be used to test ACKs.",
                "fields": []
            },
            "identify": {
                "kind": "command",
                "name": "identify",
                "identifier": 129,
                "description": "Blink an LED or otherwise draw user's attention.",
                "fields": []
            },
            "reset": {
                "kind": "command",
                "name": "reset",
                "identifier": 130,
                "description": "Reset device. ACK may or may not be sent.",
                "fields": []
            },
            "device_description": {
                "kind": "const",
                "name": "device_description",
                "identifier": 384,
                "description": "Identifies the type of hardware (eg., ACME Corp. Servo X-42 Rev C)",
                "fields": [
                    {
                        "name": "_",
                        "unit": "",
                        "type": "string",
                        "storage": "bytes"
                    }
                ]
            },
            "device_class": {
                "kind": "const",
                "name": "device_class",
                "identifier": 385,
                "description": "A numeric code for the string above; used to identify firmware images.",
                "fields": [
                    {
                        "name": "_",
                        "unit": "",
                        "type": "u32",
                        "storage": "u32"
                    }
                ]
            },
            "bootloader_device_class": {
                "kind": "const",
                "name": "bootloader_device_class",
                "identifier": 388,
                "description": "Typically the same as `device_class` unless device was flashed by hand; the bootloader will respond to that code.",
                "fields": [
                    {
                        "name": "_",
                        "unit": "",
                        "type": "u32",
                        "storage": "u32"
                    }
                ]
            },
            "firmware_version": {
                "kind": "const",
                "name": "firmware_version",
                "identifier": 389,
                "description": "A string describing firmware version; typically semver.",
                "fields": [
                    {
                        "name": "_",
                        "unit": "",
                        "type": "string",
                        "storage": "bytes"
                    }
                ]
            },
            "temperature": {
                "kind": "ro",
                "name": "temperature",
                "identifier": 386,
                "description": "MCU temperature in degrees Celsius (approximate).",
                "fields": [
                    {
                        "name": "_",
                        "unit": "C",
                        "type": "i8",
                        "storage": "i8"
                    }
                ]
            },
            "uptime": {
                "kind": "ro",
                "name": "uptime",
                "identifier": 390,
                "description": "Number of microseconds since boot.",
                "fields": [
                    {
                        "name": "_",
                        "unit": "us",
                        "type": "u64",
                        "storage": "u64"
                    }
                ]
            }
        }
    },
    "humidity": {
        "name": "Thermometer",
        "extends": [],
        "notes": {
            "short": "Base class for sensors.\nA sensor measuring humidity of outside environment.",
            "registers": "Default streaming interval is 1s."
        },
        "classIdentifier": 382210232,
        "enums": {},
        "packets": {
            "is_streaming": {
                "kind": "rw",
                "name": "is_streaming",
                "identifier": 3,
                "description": "Enables/disables broadcast streaming",
                "fields": [
                    {
                        "name": "_",
                        "unit": "",
                        "type": "bool",
                        "storage": "u8"
                    }
                ]
            },
            "streaming_interval": {
                "kind": "rw",
                "name": "streaming_interval",
                "identifier": 4,
                "description": "Period between packets of data when streaming in milliseconds.",
                "fields": [
                    {
                        "name": "_",
                        "unit": "ms",
                        "type": "u32",
                        "storage": "u32",
                        "defaultValue": 100
                    }
                ]
            },
            "humidity": {
                "kind": "ro",
                "name": "humidity",
                "identifier": 257,
                "description": "The relative humidity in percentage of full water saturation.",
                "fields": [
                    {
                        "name": "_",
                        "unit": "perc",
                        "shift": 10,
                        "type": "u22.10",
                        "storage": "u32"
                    }
                ]
            }
        }
    },
    "light": {
        "name": "Light",
        "extends": [],
        "notes": {
            "short": "A controller for strips of RGB LEDs.",
            "long": "## Light programs\n\nRealistically, with 1 mbit JACDAC, we can transmit under 2k of data per animation frame (at 20fps).\nIf transmitting raw data that would be around 500 pixels, which is not enough for many\ninstallations and it would completely clog the network.\n\nThus, light service defines a domain-specific language for describing light animations\nand efficiently transmitting them over wire.\n\nLight commands are not JACDAC commands.\nLight commands are efficiently encoded as sequences of bytes and typically sent as payload\nof `run` command.\n\nDefinitions:\n* `P` - position in the strip\n* `R` - number of repetitions of the command\n* `N` - number of pixels affected by the command\n* `C` - single color designation\n* `C+` - sequence of color designations\n\nUpdate modes:\n* `0` - replace\n* `1` - add RGB\n* `2` - subtract RGB\n* `3` - multiply RGB (by c/128); each pixel value will change by at least 1\n\nProgram commands:\n* `0xD0: set_all(C+)` - set all pixels in current range to given color pattern\n* `0xD1: fade(C+)` - set pixels in current range to colors between colors in sequence\n* `0xD2: fade_hsv(C+)` - similar to `fade()`, but colors are specified and faded in HSV\n* `0xD3: rotate_fwd(K)` - rotate (shift) pixels by `K` positions away from the connector\n* `0xD4: rotate_back(K)` - same, but towards the connector\n* `0xD5: show(M=50)` - send buffer to strip and wait `M` milliseconds\n* `0xD6: range(P=0, N=length, W=1, S=0)` - range from pixel `P`, `N` pixels long\n  (currently unsupported: every `W` pixels skip `S` pixels)\n* `0xD7: mode(K=0)` - set update mode\n* `0xD8: mode1(K=0)` - set update mode for next command only\n* `0xCF: set1(P, C)` - set one pixel at `P` (in current range) to given color\n\nA number `k` is encoded as follows:\n* `0 <= k < 128` -> `k`\n* `128 <= k < 16383` -> `0x80 | (k >> 8), k & 0xff`\n* bigger and negative numbers are not supported\n\nThus, bytes `0xC0-0xFF` are free to use for commands.\n\nFormats:\n* `0xC1, R, G, B` - single color parameter\n* `0xC2, R0, G0, B0, R1, G1, B1` - two color parameter\n* `0xC3, R0, G0, B0, R1, G1, B1, R2, G2, B2` - three color parameter\n* `0xC0, N, R0, G0, B0, ..., R(N-1), G(N-1), B(N-1)` - `N` color parameter\n* `0xCF, <number>, R, G, B` - `set1` special format\n\nCommands are encoded as command byte, followed by parameters in the order\nfrom the command definition.\n\nThe `set1()` command has irregular encoding to save space - it is byte `0xCF` followed by encoded\nnumber, and followed by 3 bytes of color."
        },
        "classIdentifier": 309264608,
        "enums": {
            "LightType": {
                "name": "LightType",
                "storage": "u8",
                "members": {
                    "WS2812B_GRB": 0,
                    "APA102": 16,
                    "SK9822": 17
                }
            }
        },
        "packets": {
            "brightness": {
                "kind": "rw",
                "name": "brightness",
                "identifier": 1,
                "description": "Set the luminosity of the strip.\nAt `0` the power to the strip is completely shut down.",
                "fields": [
                    {
                        "name": "_",
                        "unit": "frac",
                        "type": "u8",
                        "storage": "u8",
                        "defaultValue": 15
                    }
                ]
            },
            "actual_brightness": {
                "kind": "ro",
                "name": "actual_brightness",
                "identifier": 384,
                "description": "This is the luminosity actually applied to the strip.\nMay be lower than `brightness` if power-limited by the `max_power` register.\nIt will rise slowly (few seconds) back to `brightness` is limits are no longer required.\n ",
                "fields": [
                    {
                        "name": "_",
                        "unit": "frac",
                        "type": "u8",
                        "storage": "u8"
                    }
                ]
            },
            "light_type": {
                "kind": "rw",
                "name": "light_type",
                "identifier": 128,
                "description": "Specifies the type of light strip connected to controller.\nControllers which are sold with lights should default to the correct type\nand could not allow change.",
                "fields": [
                    {
                        "name": "_",
                        "unit": "",
                        "type": "LightType",
                        "storage": "u8"
                    }
                ]
            },
            "num_pixels": {
                "kind": "rw",
                "name": "num_pixels",
                "identifier": 129,
                "description": "Specifies the number of pixels in the strip.\nControllers which are sold with lights should default to the correct length\nand could not allow change.\nIncreasing length at runtime leads to ineffective use of memory and may lead to controller reboot.",
                "fields": [
                    {
                        "name": "_",
                        "unit": "",
                        "type": "u16",
                        "storage": "u16",
                        "defaultValue": 15
                    }
                ]
            },
            "max_power": {
                "kind": "rw",
                "name": "max_power",
                "identifier": 7,
                "description": "Limit the power drawn by the light-strip (and controller).",
                "fields": [
                    {
                        "name": "_",
                        "unit": "mA",
                        "type": "u16",
                        "storage": "u16",
                        "defaultValue": 200
                    }
                ]
            },
            "run": {
                "kind": "command",
                "name": "run",
                "identifier": 129,
                "description": "Run the given light \"program\". See service description for details.",
                "fields": [
                    {
                        "name": "program",
                        "unit": "",
                        "type": "bytes",
                        "storage": "bytes"
                    }
                ]
            }
        }
    },
    "motor": {
        "name": "Motor",
        "extends": [],
        "notes": {
            "short": "A bi-directional DC motor."
        },
        "classIdentifier": 385895640,
        "enums": {},
        "packets": {
            "duty": {
                "kind": "rw",
                "name": "duty",
                "identifier": 2,
                "description": "PWM duty cycle of the motor. Use negative/positive values to run the motor forwards and backwards.\nPositive is recommended to be clockwise rotation and negative counterclockwise.",
                "fields": [
                    {
                        "name": "_",
                        "unit": "frac",
                        "type": "i16",
                        "storage": "i16"
                    }
                ]
            },
            "enabled": {
                "kind": "rw",
                "name": "enabled",
                "identifier": 1,
                "description": "Turn the power to the motor on/off.",
                "fields": [
                    {
                        "name": "_",
                        "unit": "",
                        "type": "bool",
                        "storage": "u8"
                    }
                ]
            }
        }
    },
    "multitouch": {
        "name": "Multitouch",
        "extends": [],
        "notes": {
            "short": "Base class for sensors.\nA capacitive touch sensor with multiple inputs.",
            "events": "Most events include the channel number of the input."
        },
        "classIdentifier": 416636459,
        "enums": {},
        "packets": {
            "is_streaming": {
                "kind": "rw",
                "name": "is_streaming",
                "identifier": 3,
                "description": "Enables/disables broadcast streaming",
                "fields": [
                    {
                        "name": "_",
                        "unit": "",
                        "type": "bool",
                        "storage": "u8"
                    }
                ]
            },
            "streaming_interval": {
                "kind": "rw",
                "name": "streaming_interval",
                "identifier": 4,
                "description": "Period between packets of data when streaming in milliseconds.",
                "fields": [
                    {
                        "name": "_",
                        "unit": "ms",
                        "type": "u32",
                        "storage": "u32",
                        "defaultValue": 100
                    }
                ]
            },
            "capacity": {
                "kind": "ro",
                "name": "capacity",
                "identifier": 257,
                "description": "Capacitance of channels. The capacitance is continuously calibrated, and a value of `0` indicates\nno touch, wheres a value of around `100` or more indicates touch.\nIt's best to ignore this (unless debugging), and use events.",
                "fields": [
                    {
                        "name": "_",
                        "unit": "",
                        "type": "i32[]",
                        "storage": "bytes"
                    }
                ]
            },
            "touch": {
                "kind": "event",
                "name": "touch",
                "identifier": 1,
                "description": "Emitted when an input is touched.",
                "fields": [
                    {
                        "name": "channel",
                        "unit": "",
                        "type": "u32",
                        "storage": "u32"
                    }
                ]
            },
            "release": {
                "kind": "event",
                "name": "release",
                "identifier": 2,
                "description": "Emitted when an input is no longer touched.",
                "fields": [
                    {
                        "name": "channel",
                        "unit": "",
                        "type": "u32",
                        "storage": "u32"
                    }
                ]
            },
            "tap": {
                "kind": "event",
                "name": "tap",
                "identifier": 3,
                "description": "Emitted when an input is briefly touched. TODO Not implemented.",
                "fields": [
                    {
                        "name": "channel",
                        "unit": "",
                        "type": "u32",
                        "storage": "u32"
                    }
                ]
            },
            "long_press": {
                "kind": "event",
                "name": "long_press",
                "identifier": 4,
                "description": "Emitted when an input is touched for longer than 500ms. TODO Not implemented.",
                "fields": [
                    {
                        "name": "channel",
                        "unit": "",
                        "type": "u32",
                        "storage": "u32"
                    }
                ]
            },
            "swipe_pos": {
                "kind": "event",
                "name": "swipe_pos",
                "identifier": 16,
                "description": "Emitted when input channels are successively touched in order of increasing channel numbers.",
                "fields": []
            },
            "swipe_neg": {
                "kind": "event",
                "name": "swipe_neg",
                "identifier": 17,
                "description": "Emitted when input channels are successively touched in order of decreasing channel numbers.",
                "fields": []
            }
        }
    },
    "music": {
        "name": "Music",
        "extends": [],
        "notes": {
            "short": "A simple buzzer."
        },
        "classIdentifier": 458731991,
        "enums": {},
        "packets": {
            "volume": {
                "kind": "rw",
                "name": "volume",
                "identifier": 1,
                "description": "The volume (duty cycle) of the buzzer.",
                "fields": [
                    {
                        "name": "_",
                        "unit": "frac",
                        "type": "u8",
                        "storage": "u8",
                        "defaultValue": 255
                    }
                ]
            },
            "play_tone": {
                "kind": "command",
                "name": "play_tone",
                "identifier": 128,
                "description": "Play a PWM tone with given period and duty for given duration.\nThe duty is scaled down with `volume` register.\nTo play tone at frequency `F` Hz and volume `V` (in `0..max`) you will want\nto send `P = 1000000 / F` and `D = P * V / (2 * max)`.",
                "fields": [
                    {
                        "name": "period",
                        "unit": "us",
                        "type": "u16",
                        "storage": "u16"
                    },
                    {
                        "name": "duty",
                        "unit": "us",
                        "type": "u16",
                        "storage": "u16"
                    },
                    {
                        "name": "duration",
                        "unit": "ms",
                        "type": "u16",
                        "storage": "u16"
                    }
                ]
            }
        }
    },
    "power": {
        "name": "Power",
        "extends": [],
        "notes": {
            "short": "A power-provider service."
        },
        "classIdentifier": 530893146,
        "enums": {},
        "packets": {
            "enabled": {
                "kind": "rw",
                "name": "enabled",
                "identifier": 1,
                "description": "Turn the power to the bus on/off.",
                "fields": [
                    {
                        "name": "_",
                        "unit": "",
                        "type": "bool",
                        "storage": "u8",
                        "defaultValue": 1
                    }
                ]
            },
            "max_power": {
                "kind": "rw",
                "name": "max_power",
                "identifier": 7,
                "description": "Limit the power provided by the service.",
                "fields": [
                    {
                        "name": "_",
                        "unit": "mA",
                        "type": "u16",
                        "storage": "u16",
                        "defaultValue": 500
                    }
                ]
            },
            "overload": {
                "kind": "ro",
                "name": "overload",
                "identifier": 385,
                "description": "Indicates whether the power has been shut down due to overdraw.",
                "fields": [
                    {
                        "name": "_",
                        "unit": "",
                        "type": "bool",
                        "storage": "u8"
                    }
                ]
            },
            "current_draw": {
                "kind": "ro",
                "name": "current_draw",
                "identifier": 257,
                "description": "Present current draw from the bus.",
                "fields": [
                    {
                        "name": "_",
                        "unit": "mA",
                        "type": "u16",
                        "storage": "u16"
                    }
                ]
            },
            "battery_voltage": {
                "kind": "ro",
                "name": "battery_voltage",
                "identifier": 384,
                "description": "Voltage on input.",
                "fields": [
                    {
                        "name": "_",
                        "unit": "mV",
                        "type": "u16",
                        "storage": "u16"
                    }
                ]
            },
            "battery_charge": {
                "kind": "ro",
                "name": "battery_charge",
                "identifier": 386,
                "description": "Fraction of charge in the battery.",
                "fields": [
                    {
                        "name": "_",
                        "unit": "frac",
                        "type": "u16",
                        "storage": "u16"
                    }
                ],
                "optional": true
            },
            "battery_capacity": {
                "kind": "const",
                "name": "battery_capacity",
                "identifier": 387,
                "description": "Energy that can be delivered to the bus when battery is fully charged.\nThis excludes conversion overheads if any.",
                "fields": [
                    {
                        "name": "_",
                        "unit": "mWh",
                        "type": "u32",
                        "storage": "u32"
                    }
                ],
                "optional": true
            },
            "keep_on_pulse_duration": {
                "kind": "rw",
                "name": "keep_on_pulse_duration",
                "identifier": 128,
                "description": "Many USB power packs need current to be drawn from time to time to prevent shutdown.\nThis regulates how often and for how long such current is drawn.\nTypically a 1/8W 22 ohm resistor is used as load limiting the duty cycle to 10%.",
                "fields": [
                    {
                        "name": "_",
                        "unit": "ms",
                        "type": "u16",
                        "storage": "u16",
                        "defaultValue": 600
                    }
                ]
            },
            "keep_on_pulse_period": {
                "kind": "rw",
                "name": "keep_on_pulse_period",
                "identifier": 129,
                "description": "Many USB power packs need current to be drawn from time to time to prevent shutdown.\nThis regulates how often and for how long such current is drawn.\nTypically a 1/8W 22 ohm resistor is used as load limiting the duty cycle to 10%.",
                "fields": [
                    {
                        "name": "_",
                        "unit": "ms",
                        "type": "u16",
                        "storage": "u16",
                        "defaultValue": 20000
                    }
                ]
            }
        }
    },
    "servo": {
        "name": "Servo",
        "extends": [],
        "notes": {
            "short": "Servo is a small motor directed with a PWM signal.\nThis services fixes the servo period at 20ms, and the pulse can be regulated."
        },
        "classIdentifier": 318542083,
        "enums": {},
        "packets": {
            "pulse": {
                "kind": "rw",
                "name": "pulse",
                "identifier": 2,
                "description": "Specifies length of the pulse in microseconds. The period is always 20ms.",
                "fields": [
                    {
                        "name": "_",
                        "unit": "us",
                        "type": "u32",
                        "storage": "u32"
                    }
                ]
            },
            "enabled": {
                "kind": "rw",
                "name": "enabled",
                "identifier": 1,
                "description": "Turn the power to the servo on/off.",
                "fields": [
                    {
                        "name": "_",
                        "unit": "",
                        "type": "bool",
                        "storage": "u8"
                    }
                ]
            }
        }
    },
    "slider": {
        "name": "Slider",
        "extends": [],
        "notes": {
            "short": "Base class for sensors.\nA slider potentiometer."
        },
        "classIdentifier": 522667846,
        "enums": {},
        "packets": {
            "is_streaming": {
                "kind": "rw",
                "name": "is_streaming",
                "identifier": 3,
                "description": "Enables/disables broadcast streaming",
                "fields": [
                    {
                        "name": "_",
                        "unit": "",
                        "type": "bool",
                        "storage": "u8"
                    }
                ]
            },
            "streaming_interval": {
                "kind": "rw",
                "name": "streaming_interval",
                "identifier": 4,
                "description": "Period between packets of data when streaming in milliseconds.",
                "fields": [
                    {
                        "name": "_",
                        "unit": "ms",
                        "type": "u32",
                        "storage": "u32",
                        "defaultValue": 100
                    }
                ]
            },
            "position": {
                "kind": "ro",
                "name": "position",
                "identifier": 257,
                "description": "The relative position of the slider between `0x0000` and `0xffff`.",
                "fields": [
                    {
                        "name": "_",
                        "unit": "frac",
                        "type": "u16",
                        "storage": "u16"
                    }
                ]
            }
        }
    },
    "temperature": {
        "name": "Thermometer",
        "extends": [],
        "notes": {
            "short": "Base class for sensors.\nA thermometer measuring outside environment.",
            "registers": "Default streaming interval is 1s."
        },
        "classIdentifier": 337754823,
        "enums": {},
        "packets": {
            "is_streaming": {
                "kind": "rw",
                "name": "is_streaming",
                "identifier": 3,
                "description": "Enables/disables broadcast streaming",
                "fields": [
                    {
                        "name": "_",
                        "unit": "",
                        "type": "bool",
                        "storage": "u8"
                    }
                ]
            },
            "streaming_interval": {
                "kind": "rw",
                "name": "streaming_interval",
                "identifier": 4,
                "description": "Period between packets of data when streaming in milliseconds.",
                "fields": [
                    {
                        "name": "_",
                        "unit": "ms",
                        "type": "u32",
                        "storage": "u32",
                        "defaultValue": 100
                    }
                ]
            },
            "temperature": {
                "kind": "ro",
                "name": "temperature",
                "identifier": 257,
                "description": "The temperature.",
                "fields": [
                    {
                        "name": "_",
                        "unit": "C",
                        "shift": 10,
                        "type": "u22.10",
                        "storage": "u32"
                    }
                ]
            }
        }
    }
}

/**
 * Looks up a service specification by name
 * @param name 
 */
export function serviceSpecificationFromName(name: string): jdspec.ServiceSpec {
    const k = (name || "").toLowerCase().trim()
    return serviceSpecifications[name];
}

/**
 * Looks up a service specification by class
 * @param classIdentifier 
 */
export function serviceSpecificationFromClassIdentifier(classIdentifier: number): jdspec.ServiceSpec {
    if (classIdentifier === null || classIdentifier === undefined)
        return undefined;
    for (const name of Object.keys(serviceSpecifications)) {
        const spec = serviceSpecifications[name]
        if (spec.classIdentifier === classIdentifier)
            return spec;
    }
    return undefined;
}

export function isRegister(pkt: jdspec.PacketInfo) {
    return pkt.kind == "const" || pkt.kind == "ro" || pkt.kind == "rw"
}

export function numberFormatFromStorageType(tp: jdspec.StorageType) {
    switch (tp) {
        case "i8": return NumberFormat.Int8LE
        case "u8": return NumberFormat.UInt8LE
        case "i16": return NumberFormat.Int16LE
        case "u16": return NumberFormat.UInt16LE
        case "i32": return NumberFormat.Int32LE
        case "u32": return NumberFormat.UInt32LE
        case "i64": return NumberFormat.Int64LE
        case "u64": return NumberFormat.UInt64LE
        case "bytes": return null
        default: return null
    }
}

export function scaleValue(v: number, tp: string) {
    const m = /^[ui](\d+)\.(\d+)$/.exec(tp)
    if (m)
        return v / (1 << parseInt(m[2]))
    return v
}
