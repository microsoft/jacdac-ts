import { IndexedScreenReg, SRV_INDEXED_SCREEN } from "../jdom/constants"
import { JDRegisterServer } from "../jdom/servers/registerserver"
import { JDServerOptions, JDServiceServer } from "../jdom/servers/serviceserver"

export interface IndexedScreenServerOptions extends JDServerOptions {
    width?: number
    height?: number
    bitsPerPixel?: 1 | 2 | 4 | 8
    brightness?: number
    rotation?: 0 | 90 | 180 | 270
    widthMajor?: boolean
    palette: [number, number, number, number][]
}

export class IndexedScreenServer extends JDServiceServer {
    readonly width: JDRegisterServer<[number]>
    readonly height: JDRegisterServer<[number]>
    readonly bitsPerPixel: JDRegisterServer<[number]>
    readonly brightness: JDRegisterServer<[number]>
    readonly widthMajor: JDRegisterServer<[boolean]>
    readonly rotation: JDRegisterServer<[number]>
    readonly palette: JDRegisterServer<[[number, number, number, number][]]>

    _pixels: Uint8Array

    constructor(options: IndexedScreenServerOptions) {
        super(SRV_INDEXED_SCREEN, options)

        const {
            width = 8,
            height = 8,
            brightness,
            rotation = 0,
            widthMajor,
            bitsPerPixel = 1,
            palette = [
                [0, 0, 0, 0],
                [0xff, 0xff, 0xff, 0xff],
            ],
        } = options

        this.width = this.addRegister(IndexedScreenReg.Width, [width])
        this.height = this.addRegister(IndexedScreenReg.Width, [height])
        this.bitsPerPixel = this.addRegister(IndexedScreenReg.BitsPerPixel, [
            bitsPerPixel,
        ])
        this.rotation = this.addRegister(IndexedScreenReg.Rotation, [rotation])
        this.widthMajor = this.addRegister(IndexedScreenReg.WidthMajor, [
            widthMajor ?? width < height ?? false,
        ])
        this.palette = this.addRegister(IndexedScreenReg.Palette, [palette])
        if (brightness !== undefined)
            this.brightness = this.addRegister(IndexedScreenReg.Brightness, [
                128,
            ])
        this.width.skipBoundaryCheck = true
        this.width.skipErrorInjection = true
        this.height.skipBoundaryCheck = true
        this.height.skipErrorInjection = true
    }

    get pixels() {
        return this._pixels
    }
}
