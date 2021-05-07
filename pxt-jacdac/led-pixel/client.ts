namespace modules {
    //% fixedInstances
    //% blockGap=8
    export class LedPixelClient extends jacdac.Client {

        private readonly _brightness : jacdac.RegisterClient<[number]>;
        private readonly _actualBrightness : jacdac.RegisterClient<[number]>;
        private readonly _lightType : jacdac.RegisterClient<[jacdac.LedPixelLightType]>;
        private readonly _numPixels : jacdac.RegisterClient<[number]>;
        private readonly _numColumns : jacdac.RegisterClient<[number]>;
        private readonly _maxPower : jacdac.RegisterClient<[number]>;
        private readonly _maxPixels : jacdac.RegisterClient<[number]>;
        private readonly _numRepeats : jacdac.RegisterClient<[number]>;
        private readonly _variant : jacdac.RegisterClient<[jacdac.LedPixelVariant]>;            

        constructor(role: string) {
            super(jacdac.SRV_LED_PIXEL, role);

            this._brightness = this.addRegister<[number]>(jacdac.LedPixelReg.Brightness, "u0.8");
            this._actualBrightness = this.addRegister<[number]>(jacdac.LedPixelReg.ActualBrightness, "u0.8");
            this._lightType = this.addRegister<[jacdac.LedPixelLightType]>(jacdac.LedPixelReg.LightType, "u8");
            this._numPixels = this.addRegister<[number]>(jacdac.LedPixelReg.NumPixels, "u16");
            this._numColumns = this.addRegister<[number]>(jacdac.LedPixelReg.NumColumns, "u16");
            this._maxPower = this.addRegister<[number]>(jacdac.LedPixelReg.MaxPower, "u16");
            this._maxPixels = this.addRegister<[number]>(jacdac.LedPixelReg.MaxPixels, "u16");
            this._numRepeats = this.addRegister<[number]>(jacdac.LedPixelReg.NumRepeats, "u16");
            this._variant = this.addRegister<[jacdac.LedPixelVariant]>(jacdac.LedPixelReg.Variant, "u8");            
        }
    

        /**
        * Set the luminosity of the strip.
        * At `0` the power to the strip is completely shut down.
        */
        //% callInDebugger
        //% group="LED Pixel"
        //% block="%ledpixel brightness"
        //% blockId=jacdac_ledpixel_brightness___get
        //% weight=100
        brightness(): number {
            this.start();            
            const values = this._brightness.pauseUntilValues() as any[];
            return values[0] * 100;
        }

        /**
        * Set the luminosity of the strip.
        * At `0` the power to the strip is completely shut down.
        */
        //% group="LED Pixel"
        //% blockId=jacdac_ledpixel_brightness___set
        //% block="set %ledpixel brightness to %value"
        //% weight=99
        //% value.min=0
        //% value.max=100
        //% value.defl=0.05
        setBrightness(value: number) {
            this.start();
            const values = this._brightness.values as any[];
            values[0] = value / 100;
            this._brightness.values = values as [number];
        }

        /**
        * This is the luminosity actually applied to the strip.
        * May be lower than `brightness` if power-limited by the `max_power` register.
        * It will rise slowly (few seconds) back to `brightness` is limits are no longer required.
        */
        //% callInDebugger
        //% group="LED Pixel"
        //% weight=98
        actualBrightness(): number {
            this.start();            
            const values = this._actualBrightness.pauseUntilValues() as any[];
            return values[0] * 100;
        }

        /**
        * Specifies the type of light strip connected to controller.
        * Controllers which are sold with lights should default to the correct type
        * and could not allow change.
        */
        //% callInDebugger
        //% group="LED Pixel"
        //% weight=97
        lightType(): jacdac.LedPixelLightType {
            this.start();            
            const values = this._lightType.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Specifies the type of light strip connected to controller.
        * Controllers which are sold with lights should default to the correct type
        * and could not allow change.
        */
        //% group="LED Pixel"
        //% weight=96
        setLightType(value: jacdac.LedPixelLightType) {
            this.start();
            const values = this._lightType.values as any[];
            values[0] = value;
            this._lightType.values = values as [jacdac.LedPixelLightType];
        }

        /**
        * Specifies the number of pixels in the strip.
        * Controllers which are sold with lights should default to the correct length
        * and could not allow change. Increasing length at runtime leads to ineffective use of memory and may lead to controller reboot.
        */
        //% callInDebugger
        //% group="LED Pixel"
        //% weight=95
        numPixels(): number {
            this.start();            
            const values = this._numPixels.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Specifies the number of pixels in the strip.
        * Controllers which are sold with lights should default to the correct length
        * and could not allow change. Increasing length at runtime leads to ineffective use of memory and may lead to controller reboot.
        */
        //% group="LED Pixel"
        //% weight=94
        //% value.defl=15
        setNumPixels(value: number) {
            this.start();
            const values = this._numPixels.values as any[];
            values[0] = value;
            this._numPixels.values = values as [number];
        }

        /**
        * If the LED pixel strip is a matrix, specifies the number of columns. Otherwise, a square shape is assumed. Controllers which are sold with lights should default to the correct length
        * and could not allow change. Increasing length at runtime leads to ineffective use of memory and may lead to controller reboot.
        */
        //% callInDebugger
        //% group="LED Pixel"
        //% weight=93
        numColumns(): number {
            this.start();            
            const values = this._numColumns.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * If the LED pixel strip is a matrix, specifies the number of columns. Otherwise, a square shape is assumed. Controllers which are sold with lights should default to the correct length
        * and could not allow change. Increasing length at runtime leads to ineffective use of memory and may lead to controller reboot.
        */
        //% group="LED Pixel"
        //% weight=92
        setNumColumns(value: number) {
            this.start();
            const values = this._numColumns.values as any[];
            values[0] = value;
            this._numColumns.values = values as [number];
        }

        /**
        * Limit the power drawn by the light-strip (and controller).
        */
        //% callInDebugger
        //% group="LED Pixel"
        //% weight=91
        maxPower(): number {
            this.start();            
            const values = this._maxPower.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Limit the power drawn by the light-strip (and controller).
        */
        //% group="LED Pixel"
        //% weight=90
        //% value.defl=200
        setMaxPower(value: number) {
            this.start();
            const values = this._maxPower.values as any[];
            values[0] = value;
            this._maxPower.values = values as [number];
        }

        /**
        * The maximum supported number of pixels.
        * All writes to `num_pixels` are clamped to `max_pixels`.
        */
        //% callInDebugger
        //% group="LED Pixel"
        //% weight=89
        maxPixels(): number {
            this.start();            
            const values = this._maxPixels.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * How many times to repeat the program passed in `run` command.
        * Should be set before the `run` command.
        * Setting to `0` means to repeat forever.
        */
        //% callInDebugger
        //% group="LED Pixel"
        //% weight=88
        numRepeats(): number {
            this.start();            
            const values = this._numRepeats.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * How many times to repeat the program passed in `run` command.
        * Should be set before the `run` command.
        * Setting to `0` means to repeat forever.
        */
        //% group="LED Pixel"
        //% weight=87
        //% value.defl=1
        setNumRepeats(value: number) {
            this.start();
            const values = this._numRepeats.values as any[];
            values[0] = value;
            this._numRepeats.values = values as [number];
        }

        /**
        * Specifies the shape of the light strip.
        */
        //% callInDebugger
        //% group="LED Pixel"
        //% weight=86
        variant(): jacdac.LedPixelVariant {
            this.start();            
            const values = this._variant.pauseUntilValues() as any[];
            return values[0];
        }

        /**
         * Configure the light strip
         */
        //% blockId=jacdaclightsetstrip
        //% block="configure %light with $numpixels LEDs $type||$maxpower"
        //% group="LED Pixel"
        //% weight=0
        //% numpixels.min=0
        //% numpixels.defl=30
        configure(numpixels: number, type?: jacdac.LedPixelLightType.WS2812B_GRB, maxpower?: number): void {
            this.setNumPixels(numpixels)
            if (type !== undefined)
                this.setLightType(type)
            if (maxpower !== undefined)
                this.setMaxPower(maxpower)
        }

        runProgram(prog: Buffer) {
            this.start()
            this.currAnimation++
            this.sendCommand(jacdac.JDPacket.from(jacdac.LedPixelCmd.Run, prog))
        }

        runEncoded(prog: string, args?: number[]) {
            const encoded = jacdac.lightEncode(prog, args)
            this.runProgram(encoded)
        }

        /**
         * Set a single of the pixels on the strip to one RGB color.
         * @param rgb RGB color of the LED
         */
        //% blockId="jdlight_set_pixel_color" block="set %strip color at %index pixels to %rgb=colorNumberPicker"
        //% weight=81 blockGap=8
        //% group="LED Pixel"
        setPixel(index: number, rgb: number) {
            this.runEncoded("setone % # wait 1", [index, rgb])
        }

        /**
         * Set all of the pixels on the strip to one RGB color.
         * @param rgb RGB color of the LED
         */
        //% blockId="jdlight_set_strip_color" block="set %strip all pixels to %rgb=colorNumberPicker"
        //% weight=80 blockGap=8
        //% group="LED Pixel"
        setAll(rgb: number) {
            this.runEncoded("fade # wait 1", [rgb])
        }

        private currAnimation = 0

        /**
         * Show an animation or queue an animation in the animation queue
         * @param animation the animation to run
         * @param duration the duration to run in milliseconds, eg: 500
         */
        //% blockId=jdlight_show_animation block="show %strip animation %animation for %duration=timePicker ms"
        //% weight=90 blockGap=8
        //% group="LED Pixel"
        showAnimation(animation: ledPixelAnimations.Animation, duration: number, color = 0) {
            const currAnim = ++this.currAnimation
            control.runInParallel(() => {
                const n = this.numPixels();
                if (!n) return
                const instance = animation.create(this.numPixels())
                instance.clear()
                this.backgroundAnimate(currAnim, instance, duration, color);
            })
        }

        private backgroundAnimate(currAnim: number, animation: ledPixelAnimations.Animation, duration: number, color = 0) {
            let buf: Buffer = null
            let totTime = 0
            let last = false
            this.currAnimation--
            this.runEncoded("setall #000000") // clear first
            const frameTime = 50
            for (; ;) {
                if (currAnim != this.currAnimation)
                    return
                let framelen = 0
                const frames: Buffer[] = []
                let waitTime = 0
                const wait = jacdac.lightEncode("wait %", [frameTime])
                for (; ;) {
                    if (!buf)
                        buf = animation.nextFrame()
                    if (!buf || !buf.length) {
                        last = true
                        animation.clear()
                        break
                    }
                    if (framelen + buf.length > 220)
                        break
                    framelen += buf.length + wait.length
                    frames.push(buf)
                    frames.push(wait)
                    buf = null
                    waitTime += frameTime
                    totTime += frameTime
                    if (waitTime > 500 || (duration > 0 && totTime >= duration))
                        break
                }
                if (framelen) {
                    this.currAnimation--
                    this.runProgram(Buffer.concat(frames))
                }
                pause(waitTime)
                if ((duration > 0 && totTime >= duration) || (duration <= 0 && last))
                    break
            }
        }
    }

    export namespace ledPixelAnimations {
        //% fixedInstances
        export class Animation {
            protected length: number
            protected step: number
            protected color = 0xffffff
            constructor() { }

            create(length: number): Animation {
                return undefined
            }

            clear() {
                this.step = 0
            }
            nextFrame(): Buffer {
                return null
            }
        }

        class RainbowCycle extends Animation {
            constructor() {
                super();
            }

            create(length: number): Animation {
                const anim = new RainbowCycle()
                anim.length = length;
                return anim;
            }

            nextFrame() {
                // we want to move by half step each frame, so we generate slightly shifted fade on odd steps
                const off = Math.idiv(128, this.length) << 16
                let c0 = 0x00ffff
                let c1 = 0xffffff
                if (this.step & 1) c0 += off
                else c1 -= off
                if (this.step > (this.length << 1))
                    return null
                return jacdac.lightEncode("fadehsv # # rotback %", [c0, c1, this.step++ >> 1])
            }
        }
        //% fixedInstance whenUsed block="rainbow cycle"
        export const rainbowCycle: Animation = new RainbowCycle();

        function scale(col: number, level: number) {
            level = Math.clamp(0, 0xff, level)
            return (((col >> 16) * level) >> 8) << 16 |
                ((((col >> 8) & 0xff) * level) >> 8) << 8 |
                (((col & 0xff) * level) >> 8)
        }

        class RunningLights extends Animation {
            constructor() {
                super()
                this.color = 0xff0000
            }

            create(length: number) {
                const anim = new RunningLights()
                anim.length = length;
                return anim;
            }

            // you need lots of pixels to see this one
            nextFrame() {
                const stops = Math.clamp(2, 70, this.length >> 4)
                const stopVals: number[] = []
                for (let i = 0; i < stops; ++i)
                    stopVals.push(scale(this.color, Math.isin(this.step + Math.idiv(i * this.length, stops))))
                this.step++

                if (this.step >= 256)
                    return null

                return jacdac.lightEncode("fade #", [stopVals])
            }
        }

        //% fixedInstance whenUsed block="running lights"
        export const runningLights: Animation = new RunningLights();

        class Comet extends Animation {
            constructor() {
                super()
                this.color = 0xff00ff
            }

            create(length: number) {
                const anim = new Comet()
                anim.length = length;
                return anim;
            }

            nextFrame() {
                const off = (this.step * this.step) % this.length
                if (this.step++ >= 20)
                    return null
                return jacdac.lightEncode("fade # # rotback %", [this.color, this.color & 0x00ffff, off])
            }
        }

        //% fixedInstance whenUsed block="comet"
        export const comet: Animation = new Comet();

        class Sparkle extends Animation {
            constructor() {
                super()
                this.color = 0xffffff
            }

            create(length: number) {
                const anim = new Sparkle()
                anim.length = length;
                return anim;
            }

            private lastpix = -1

            nextFrame() {
                if (this.step++ == 0)
                    return jacdac.lightEncode("setall #000000", [])

                if (this.step >= 50)
                    return null
                const p = this.lastpix
                if (p < 0) {
                    this.lastpix = Math.randomRange(0, this.length - 1)
                    return jacdac.lightEncode("setone % #", [this.lastpix, this.color])
                } else {
                    this.lastpix = -1
                    return jacdac.lightEncode("setone % #000000", [p])
                }
            }
        }

        //% fixedInstance whenUsed block="sparkle"
        export const sparkle: Animation = new Sparkle();

        class ColorWipe extends Animation {
            constructor() {
                super()
                this.color = 0x0000ff
            }

            create(length: number) {
                const anim = new ColorWipe()
                anim.length = length;
                return anim;
            }

            nextFrame() {
                const col = this.step < this.length ? this.color : 0
                let idx = this.step++
                if (idx >= this.length) idx -= this.length
                if (idx >= this.length)
                    return null
                return jacdac.lightEncode("setone % #", [idx, col])
            }
        }

        //% fixedInstance whenUsed block="color wipe"
        export const colorWipe: Animation = new ColorWipe();

        class TheaterChase extends Animation {
            constructor() {
                super()
                this.color = 0x0000ff
            }

            create(length: number) {
                const anim = new TheaterChase()
                anim.length = length;
                return anim;
            }

            nextFrame() {
                if (this.step++ >= this.length)
                    return null
                let idx = this.step % 3
                return jacdac.lightEncode("setall # # #", [
                    idx == 0 ? this.color : 0,
                    idx == 1 ? this.color : 0,
                    idx == 2 ? this.color : 0
                ])
            }
        }

        //% fixedInstance whenUsed block="theather chase"
        export const theatherChase: Animation = new TheaterChase();

        class Fireflys extends Animation {
            positions: number[]
            constructor() {
                super()
                this.color = 0xffff00
            }

            create(length: number): Animation {
                const anim = new Fireflys()
                anim.length = length;
                return anim;
            }

            clear() {
                this.positions = null
            }

            nextFrame() {
                if (this.step++ >= this.length)
                    return null
                if (this.positions == null) {
                    this.positions = []
                    const num = (this.length >> 4) + 2;
                    for (let i = 0; i < num; ++i) {
                        this.positions[i] = Math.randomRange(0, this.length - 1)
                    }
                }
                let cmd = "mult 0.8 "
                let args: number[] = []
                for (let i = 0; i < this.positions.length; ++i) {
                    this.positions[i] = Math.clamp(0, this.length - 1, this.positions[i] + Math.randomRange(-1, 1))
                    cmd += "setone % # "
                    args.push(this.positions[i])
                    args.push(this.color)
                }
                return jacdac.lightEncode(cmd, args)
            }
        }
        //% fixedInstance whenUsed block="firefly"
        export const firefly: Animation = new Fireflys();
    }

    //% fixedInstance whenUsed
    export const ledPixel1 = new LedPixelClient("ledPixel 1");
}