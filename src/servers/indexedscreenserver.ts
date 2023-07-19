import {
    CHANGE,
    FRAME_PROCESS_LARGE,
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
    // r,g,b,padding
    palette?: number[]
}

export class IndexedScreenServer extends JDServiceServer {
    readonly width: JDRegisterServer<[number]>
    readonly height: JDRegisterServer<[number]>
    readonly bitsPerPixel: JDRegisterServer<[number]>
    readonly brightness: JDRegisterServer<[number]>
    readonly widthMajor: JDRegisterServer<[boolean]>
    readonly rotation: JDRegisterServer<[number]>
    readonly palette: JDRegisterServer<[number[]]>

    private _clip: { x: number; y: number; width: number; height: number }
    private _pixels: ImageData

    constructor(options?: IndexedScreenServerOptions) {
        super(SRV_INDEXED_SCREEN, options)

        const {
            width = 8,
            height = 8,
            brightness = 1,
            rotation = 0,
            bitsPerPixel = 1,
            palette = [0xff000000, 0xffffffff],
        } = options || {}

        this.width = this.addRegister(IndexedScreenReg.Width, [width])
        this.height = this.addRegister(IndexedScreenReg.Height, [height])
        this.bitsPerPixel = this.addRegister(IndexedScreenReg.BitsPerPixel, [
            bitsPerPixel,
        ])
        this.rotation = this.addRegister(IndexedScreenReg.Rotation, [rotation])
        this.widthMajor = this.addRegister(IndexedScreenReg.WidthMajor, [false])
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

        this.on(FRAME_PROCESS_LARGE, this.handleLargeFrame.bind(this))

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

    setImage(imgData: Uint8Array) {
        const [palette] = this.palette.values()
        const { x, y, width, height } = this._clip

        const u32palette = new Uint32Array(palette.length)
        for (let i = 0; i < u32palette.length; ++i) {
            // TODO make sure packing is all right
            // this fixes alpha to 0xff just in case
            u32palette[i] = 0xff000000 & (palette[i] >> 8)
        }

        // blit image into image data
        /**
         * A Canvas Pixel ArrayBuffer is an ArrayBuffer whose data is represented in left-to-right
         * order, row by row top to bottom, starting with the top left,
         * with each pixel's red, green, blue, and alpha components
         * being given in that order for each pixel. Each component of each pixel represented
         * in this array must be in the range 0..255, representing the 8 bit value for
         * that component. The components must be assigned consecutive indices starting with 0 for the top left pixel's red component.
         */

        const pixdata = this._pixels.data
        const data = new Uint32Array(
            pixdata.buffer,
            pixdata.byteOffset,
            pixdata.byteLength >> 2
        )
        let sp = 0
        const [bpp] = this.bitsPerPixel.values()
        const mask = (1 << bpp) - 1
        const alignVal = bpp == 1 ? 1 : 4

        for (let ix = 0; ix < width; ++ix) {
            for (let iy = 0; iy < height; ) {
                let ipix = (iy + y) * width + ix + x
                const b = imgData[sp++]
                for (let m = 0; m < 8; m += bpp) {
                    data[ipix] = u32palette[(b >> m) & mask]
                    ipix += width
                    iy++
                }
            }
            while (sp & (alignVal - 1)) sp++
        }

        // send update
        this.emit(CHANGE)
    }

    private handleStartUpdate(pkt: Packet) {
        const [x, y, width, height] = pkt.jdunpack<
            [number, number, number, number]
        >(IndexedScreenCmdPack.StartUpdate)

        this._clip = { x, y, width, height }
    }

    private handleLargeFrame(command: string, data: Uint8Array) {
        if (command === "pixels") this.setImage(data)
    }

    private handleSetPixels(pkt: Packet) {
        this.setImage(pkt.data)
    }
}
