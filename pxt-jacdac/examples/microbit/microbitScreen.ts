namespace microbit {
    export class Screen extends jacdac.Server {
        constructor() {
            super("screen", 0x110d154b)
        }
        
        handlePacket(packet: jacdac.JDPacket) {
            if (packet.regCode == 0x02) {
                if (packet.isRegSet) {
                    let x = 0, y = 0;
                    for (let i=0; i<25; i++) {
                        let byte = Math.floor(i/5);
                        let bit = 1 << (i - (byte*5)); 
                        if (packet.data[byte] & bit) 
                            led.plot(x,y);
                        else led.unplot(x,y);
                        x++; if (x ==5) { x=0; y++; }
                    }
                } else {
                    let x = 0, y = 0;
                    let buf = Buffer.create(5);
                    for (let i=0; i<25; i++) {
                        if (led.point(x, y)) {
                            let byte = Math.floor(i/5);
                            let bit = 1 << (i - (byte*5)); 
                            buf[byte] |= bit; 
                        }
                        x++; if (x == 5) { x=0; y++; }
                    }
                    this.handleRegBuffer(packet, packet.regCode, buf);
                }
            } else if (packet.regCode == 0x181 || 
                       packet.regCode == 0x182) {
                this.handleRegValue(packet, packet.regCode, "u16", 5);
            }
        }
    }
}