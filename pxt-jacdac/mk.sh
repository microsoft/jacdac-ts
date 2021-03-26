#!/bin/sh

set -e
makecode -u -j --mono-repo -c mkc.json
makecode -u -j --mono-repo -c mkc-maker.json
makecode -u -j --mono-repo -c mkc-arcade.json
