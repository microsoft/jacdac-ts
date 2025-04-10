import { createProxyBridge } from "./bridge"
import { JDBus } from "./bus"
import { randomDeviceId } from "./random"

export function startDevTools() {
    if (
        typeof window !== "undefined" &&
        !/^https:\/\/jacdac.github.io\/jacdac-docs\//.test(window.location.href)
    )
        window.location.href = `https://jacdac.github.io/jacdac-docs/clients/javascript/devtools.html#${window.location.href}`
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
    },
): () => void {
    // check that dev tools haven't been injected already
    if (
        typeof window === "undefined" ||
        document.getElementById("jacdac-dev-tools")
    )
        return undefined

    // inject style
    if (!document.getElementById("jacdac-dev-tools-style")) {
        const style = document.createElement("style")
        style.id = "jacdac-dev-tools-style"
        style.innerText = `
        #jacdac-dev-tools {
            position: fixed;
            overflow: hide;
            box-shadow: 4px 4px 4px 4px #ccc;
            width: 40rem;
            height: min(48rem, 64%);
            background: #fff;
            z-index: 1000000;
            
            transition: left 0.5s, right 0.5s, bottom 0.5s, top 0.5s, width 0.5s, height 0.5s, opacity 1s;
            left:2rem;
            bottom: 2rem;        
          }
          #jacdac-dev-tools button {
            float: right;
            margin-right: 0.5rem;
          }
          #jacdac-dev-tools.right {
            left: calc(100% - 42rem);
          }
          #jacdac-dev-tools.tall {
            height: calc(100% - 4rem);
          }
          #jacdac-dev-tools.shallow {
            height: max(22rem, 30%);
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
    }

    const { dashboardUrl = "https://jacdac.github.io/jacdac-docs/dashboard/" } =
        options || {}
    const frameid = randomDeviceId()

    const container = document.createElement("div")
    container.id = "jacdac-dev-tools"
    container.classList.add("right")
    const header = document.createElement("div")
    header.className = "header"
    container.append(header)

    const iframe = document.createElement("iframe")
    iframe.allow =
        "gamepad; microphone; camera; accelerometer; gyroscope; ambient-light-sensor; magnetometer"
    iframe.sandbox.add(
        "allow-forms",
        "allow-downloads-without-user-activation",
        "allow-downloads",
        "allow-popups",
        "allow-popups-to-escape-sandbox",
        "allow-same-origin",
        "allow-scripts",
    )
    iframe.src = `${dashboardUrl}?embed=1&connect=0&transient=1#${frameid}`
    container.append(iframe)
    document.body.insertBefore(container, document.body.firstElementChild)

    // send packets to dashboard iframe
    const unsub = bus.addBridge(
        createProxyBridge((data, sender) => {
            iframe.contentWindow?.postMessage({
                type: "messagepacket",
                channel: "jacdac/pxt-jacdac",
                data,
                sender,
            })
        }),
    )
    const cleanup = () => {
        unsub?.()
        container.remove()
    }

    const addButton = (
        text: string,
        onclick: (btn: HTMLButtonElement) => void,
    ) => {
        const btn = document.createElement("button")
        btn.innerText = text
        btn.onclick = () => onclick(btn)

        header.append(btn)
    }

    addButton("close", cleanup)
    addButton(">>>", () => container.classList.add("right"))
    const up = "^"
    const mid = "-"
    const low = "."
    addButton(up, btn => {
        if (btn.innerText === up) {
            btn.innerText = low
            container.classList.remove("shallow")
            container.classList.add("tall")
        } else if (btn.innerText === low) {
            btn.innerText = mid
            container.classList.add("shallow")
            container.classList.remove("tall")
        } else {
            btn.innerText = up
            container.classList.remove("shallow")
            container.classList.remove("tall")
        }
    })
    addButton("<<<", () => container.classList.remove("right"))
    return cleanup
}
