namespace modules {
    /**
     * Data transfer over TCP/IP and TLS stream sockets.
     **/
    //% fixedInstances blockGap=8
    export class TcpClient extends jacdac.Client {
            

        constructor(role: string) {
            super(jacdac.SRV_TCP, role);
            
        }
    

    
    }
    //% fixedInstance whenUsed
    export const tcp = new TcpClient("tcp");
}