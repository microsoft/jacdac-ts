# Jacdac

## ~ hint

**Jacdac is still in early prototyping phase.** The protocol and all hardware design are MOST LIKELY to change during this phase. You are welcome to join us in prototyping but we strongly recommend avoiding going to production with Jacdac at the current stage.

## ~

### Pin configuration

The following pins must be configured ``config.ts`` for Jacdac to work on a board.

* ``PIN_JACK_TX``: pin with EINT, SERCOM[0]. To determine if the pin is compatible with Jacdac, consult the MCU schematics.
* (optional) ``PIN_JACK_COMMLED``: LED pin, blinks when packet is received or transmitted
* (optional) ``JACK_BUSLED``: LED pin, turns on when Jacdac is connected

### Simulator configuration

The ``board.json`` must contain a mapping from ``JACK_TX`` to a positioned pin in order to be able to route cables in the simulator. Add a map in ``gpioPinMap``.