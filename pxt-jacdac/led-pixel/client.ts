namespace modules {
    //% fixedInstances
    //% blockGap=8
    export class LedPixelClient extends jacdac.Client {
        constructor(role: string) {
            super(jacdac.SRV_LED_PIXEL, role);
        }

        _length = 10

        /**
         * Configure the light strip
         */
        //% blockId=jacdaclightsetstrip
        //% block="configure %light with $numpixels LEDs $type||$maxpower"
        //% group="Light"
        //% weight=0
        //% numpixels.min=0
        //% numpixels.defl=30
        configure(numpixels: number, type = jacdac.LedPixelLightType.WS2812B_GRB, maxpower = 500): void {
            this._length = numpixels >> 0;
            this.setReg(jacdac.LedPixelReg.NumPixels, "u16", [this._length])
            this.setReg(jacdac.LedPixelReg.LightType, "u8", [type])
            this.setReg(jacdac.LedPixelReg.MaxPower, "u16", [maxpower])
        }

        /**
         * Set the brightness of the strip. This flag only applies to future operation.
         * @param brightness a measure of LED brightness in 0-255. eg: 20
         */
        //% blockId="jdlight_set_brightness" block="set %strip brightness %brightness"
        //% brightness.min=0 brightness.max=255
        //% weight=2 blockGap=8
        //% group="Light"
        setBrightness(brightness: number): void {
            // jacdac expects brightness between 0...1, MakeCode usually uses 0..255
            this.setReg(jacdac.LedPixelReg.Brightness, "u0.8", [brightness / 0xff])
        }

        runProgram(prog: Buffer) {
            this.currAnimation++
            this.sendCommandWithAck(jacdac.JDPacket.from(jacdac.LedPixelCmd.Run, prog))
        }

        runEncoded(prog: string, args?: number[]) {
            if (!args) args = []
            this.currAnimation++
            this.sendCommand(jacdac.JDPacket.from(jacdac.LedPixelCmd.Run, jacdac.lightEncode(prog, args)))
        }

        set(idx: number, rgb: number) {
            this.runEncoded("setone % # wait 1", [idx, rgb])
        }

        /**
         * Set all of the pixels on the strip to one RGB color.
         * @param rgb RGB color of the LED
         */
        //% blockId="jdlight_set_strip_color" block="set %strip all pixels to %rgb=colorNumberPicker"
        //% weight=80 blockGap=8
        //% group="Light"
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
        //% group="Light"
        showAnimation(animation: lightanimation.Animation, duration: number, color = 0) {
            const currAnim = ++this.currAnimation
            control.runInParallel(() => {
                const instance = animation.create(this._length)
                instance.clear()
                this.backgroundAnimate(currAnim, instance, duration, color);
            })
        }

        private backgroundAnimate(currAnim: number, animation: lightanimation.Animation, duration: number, color = 0) {
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

    export namespace lightanimation {
        //% fixedInstances
        export abstract class Animation {
            protected length: number
            protected step: number
            protected color = 0xffffff
            constructor() { }

            abstract create(length: number): Animation;

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
        //% fixedInstance whenUsed
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

        //% fixedInstance whenUsed
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

        //% fixedInstance whenUsed
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

        //% fixedInstance whenUsed
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

        //% fixedInstance whenUsed
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

        //% fixedInstance whenUsed
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
        //% fixedInstance whenUsed
        export const firefly: Animation = new Fireflys();
    }

    //% fixedInstance whenUsed
    export const ledPixel = new LedPixelClient("ledPixel");
}