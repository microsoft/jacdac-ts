#!/bin/sh

set -x
set -e

scp pibridge.c pi:spi/
ssh pi 'cd spi && gcc -W -Wall pibridge.c -lwiringPi -lpthread && sudo ./a.out'
