/**
 * Blocs to handle Jacdac servers
 */
//% icon="icons/jacdac.svg"
//% weight=79 color="#009900"
namespace servers {
    /**
     * Starts a jacdac server. Add this bloc at the start of ``on start``.
     */
    //% blockId=jacdac_start_server block="start $server server"
    export function startServer(server: jacdac.Server) {
        if (server)
            server.start()
    }
}