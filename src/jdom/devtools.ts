import { createProxyBridge } from "./bridge"
import { JDBus } from "./bus"
import { randomDeviceId } from "./random"

export function startDevTools() {
    if (
        typeof window !== "undefined" &&
        !/^https:\/\/microsoft.github.io\/jacdac-docs\//.test(
            window.location.href
        )
    )
        window.location.href = `https://microsoft.github.io/jacdac-docs/clients/javascript/devtools.html#${window.location.href}`
}

/**
 * Starts an external or in-page hosted developer tool window for jacdac
 * @param bus
 * @returns function to remove the devtools
 */
export function injectDevTools(
    bus: JDBus,
    options?: {
        dashboardUrl?: string
    }
): () => void {
    // check that dev tools haven't been injected already
    if (
        typeof window === "undefined" ||
        document.getElementById("jacdac-dev-tools")
    )
        return undefined

    // inject style
    const {
        dashboardUrl = "https://microsoft.github.io/jacdac-docs/dashboard/",
    } = options || {}
    const frameid = randomDeviceId()
    const style = document.createElement("style")
    style.innerText = `
    #jacdac-dev-tools {
        position: fixed;
        overflow: hide;
        box-shadow: 4px 4px 4px 4px #ccc;
        width: 40rem;
        height: 60%;
        background: #fff;
        z-index: 1000000;
        
        transition: left 0.5s, right 0.5s, bottom 0.5s, top 0.5s, width 0.5s, height 0.5s, opacity 1s;
      }
      #jacdac-dev-tools button {
        float: right;
        margin-right: 0.5rem;
      }
      #jacdac-dev-tools.left {
        left:2rem;
        right: unset;
        bottom: 2rem;        
        top: unset;
      }
      #jacdac-dev-tools.right {
        left: unset;
        right:2rem;
        bottom: 2rem;        
        top: unset;
      }
      #jacdac-dev-tools > .header {
        font-size: 0.8rem;
        font-family: monospace;
        margin: 0.2rem;
        height: 1.5rem;
      }
      #jacdac-dev-tools > iframe {
        height: calc(100% - 1.5rem);
        width: 100%;
        border: none;
      }    
    `
    document.head.appendChild(style)

    const container = document.createElement("div")
    container.id = "jacdac-dev-tools"
    container.classList.add("right")
    const header = document.createElement("div")
    header.className = "header"
    container.append(header)
    const close = document.createElement("button")
    close.innerText = "close"
    const left = document.createElement("button")
    left.innerText = "<<<"
    left.onclick = () => {
        container.classList.remove("right")
        container.classList.add("left")
    }
    const right = document.createElement("button")
    right.innerText = ">>>"
    right.onclick = () => {
        container.classList.remove("left")
        container.classList.add("right")
    }
    header.append(close)
    header.append(right)
    header.append(left)
    const iframe = document.createElement("iframe")
    iframe.src = `${dashboardUrl}?embed=1&connect=0&transient=1#${frameid}`
    container.append(iframe)
    document.body.insertBefore(container, document.body.firstElementChild)

    // send packets to dashboard iframe
    const unsub = bus.addBridge(
        createProxyBridge((data, sender) => {
            iframe.contentWindow?.postMessage({
                type: "messagepacket",
                channel: "jacdac",
                data,
                sender,
            })
        })
    )
    const cleanup = () => {
        unsub?.()
        container.remove()
    }
    close.onclick = cleanup

    return cleanup
}
