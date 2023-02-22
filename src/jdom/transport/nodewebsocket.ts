import {
    createWebSocketTransport,
    WebSocketTransportOptions,
} from "./websockettransport"

/**
 * Creates a transport over a websocket for node.js. Requires 'websocket-polyfill` package.
 */
export function createNodeWebSocketTransport(
    url: string,
    options?: WebSocketTransportOptions
) {
    require("websocket-polyfill")
    const ops: WebSocketTransportOptions = {
        ...(options || { protocols: "wss" }),
        WebSocket: WebSocket,
    }
    return createWebSocketTransport(url, ops)
}
