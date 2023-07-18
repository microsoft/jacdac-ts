import {
    CHANGE,
    IndexedScreenCmd,
    IndexedScreenCmdPack,
    IndexedScreenReg,
    SRV_INDEXED_SCREEN,
} from "../jdom/constants"
import { Packet } from "../jdom/packet"
import { JDRegisterServer } from "../jdom/servers/registerserver"
import { JDServerOptions, JDServiceServer } from "../jdom/servers/serviceserver"

export interface IndexedScreenServerOptions extends JDServerOptions {
    width?: number
    height?: number
    bitsPerPixel?: 1 | 2 | 4 | 8
    brightness?: number
    rotation?: 0 | 90 | 180 | 270
    widthMajor?: boolean
    // r,g,b,padding
    palette?: [number, number, number, number][]
}

export class IndexedScreenServer extends JDServiceServer {
    readonly width: JDRegisterServer<[number]>
    readonly height: JDRegisterServer<[number]>
    readonly bitsPerPixel: JDRegisterServer<[number]>
    readonly brightness: JDRegisterServer<[number]>
    readonly widthMajor: JDRegisterServer<[boolean]>
    readonly rotation: JDRegisterServer<[number]>
    readonly palette: JDRegisterServer<[[number, number, number, number][]]>

    _clip: { x: number; y: number; width: number; height: number }
    _pixels: ImageData

    constructor(options?: IndexedScreenServerOptions) {
        super(SRV_INDEXED_SCREEN, options)

        const {
            width = 8,
            height = 8,
            brightness = 1,
            rotation = 0,
            widthMajor,
            bitsPerPixel = 1,
            palette = [
                [0, 0, 0, 0],
                [0xff, 0xff, 0xff, 0xff],
            ],
        } = options || {}

        this.width = this.addRegister(IndexedScreenReg.Width, [width])
        this.height = this.addRegister(IndexedScreenReg.Height, [height])
        this.bitsPerPixel = this.addRegister(IndexedScreenReg.BitsPerPixel, [
            bitsPerPixel,
        ])
        this.rotation = this.addRegister(IndexedScreenReg.Rotation, [rotation])
        this.widthMajor = this.addRegister(IndexedScreenReg.WidthMajor, [
            widthMajor ?? width < height ?? false,
        ])
        this.palette = this.addRegister(IndexedScreenReg.Palette, [palette])
        this.brightness = this.addRegister(IndexedScreenReg.Brightness, [
            brightness,
        ])
        this.addCommand(
            IndexedScreenCmd.SetPixels,
            this.handleSetPixels.bind(this)
        )
        this.addCommand(
            IndexedScreenCmd.StartUpdate,
            this.handleStartUpdate.bind(this)
        )
        this.width.skipBoundaryCheck = true
        this.width.skipErrorInjection = true
        this.height.skipBoundaryCheck = true
        this.height.skipErrorInjection = true

        this.width.on(CHANGE, this.updatePixels.bind(this))
        this.height.on(CHANGE, this.updatePixels.bind(this))

        this.updatePixels()
    }

    private updatePixels() {
        const [width] = this.width.values()
        const [height] = this.height.values()
        this._clip = {
            x: 0,
            y: 0,
            width,
            height,
        }
        this._pixels = new ImageData(width, height)
    }

    get pixels() {
        return this._pixels
    }

    private handleStartUpdate(pkt: Packet) {
        const [x, y, width, height] = pkt.jdunpack<
            [number, number, number, number]
        >(IndexedScreenCmdPack.StartUpdate)

        this._clip = { x, y, width, height }
    }

    private handleSetPixels(pkt: Packet) {
        const [palette] = this.palette.values()
        const { x, y, width, height } = this._clip
        // decode payload into pixel
        const setdata = pkt.data

        // blit image into image data
        /**
         * A Canvas Pixel ArrayBuffer is an ArrayBuffer whose data is represented in left-to-right
         * order, row by row top to bottom, starting with the top left,
         * with each pixel's red, green, blue, and alpha components
         * being given in that order for each pixel. Each component of each pixel represented
         * in this array must be in the range 0..255, representing the 8 bit value for
         * that component. The components must be assigned consecutive indices starting with 0 for the top left pixel's red component.
         */
        const data = this._pixels.data
        for (let iy = 0; iy < height; ++iy) {
            for (let ix = 0; ix < width; ++ix) {
                const c = palette[0] // TODO decode payload
                const ip = (iy * width + ix) * 4
                data[ip] = c[0] // r
                data[ip + 1] = c[1] // g
                data[ip + 2] = c[2] // b
                data[ip + 3] = 0xff // a
            }
        }

        // send update
        this.emit(CHANGE)
    }
}
