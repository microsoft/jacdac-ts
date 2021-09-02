import JDServiceProvider from "./serviceprovider"

export class IFrameServiceProvider extends JDServiceProvider {
    private _iframe: HTMLIFrameElement
    private readonly urlFormatter: (url: string, id?: string) => string

    constructor(
        private readonly urlRoot: string,
        options?: {
            deviceId?: string
            urlFormatter?: (url: string, id?: string) => string
        }
    ) {
        super(options?.deviceId)
        this.urlFormatter =
            options?.urlFormatter || ((url, id) => `${url}#${id}`)
    }

    get url() {
        return this.urlFormatter(this.urlRoot, this.deviceId)
    }

    get iframe(): HTMLElement {
        return this._iframe
    }

    protected start(): void {
        if (typeof Window === "undefined") return // no DOM

        // position iframe to the bottom right of the window
        this._iframe = document.createElement("iframe")
        this._iframe.style.width = "1px"
        this._iframe.style.height = "1px"
        this._iframe.style.position = "absolute"
        this._iframe.style.right = "1px"
        this._iframe.style.bottom = "1px"

        this._iframe.allow = "usb;serial"
        this._iframe.src = this.url
    }

    protected stop(): void {
        // unload iframe if needed
        if (this._iframe?.parentElement) {
            this._iframe.parentElement.removeChild(this._iframe)
        }
        this._iframe = undefined
    }
}
export default IFrameServiceProvider
