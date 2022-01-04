/// <reference path="../jacdac-spec/dist/jacscript-spec.d.ts" />

declare class Role {}

declare class JDPacketInfo {}

declare class JDRegister extends JDPacketInfo {}

declare class JDRegisterNum extends JDRegister {
    read(): number
    write(v: number | boolean): void
    onChange(threshold: number, handler: (curr: number) => void): void
}

declare class JDRegisterString extends JDRegister {
    read(): string
    write(v: string): void
}

declare class JDRegisterArray extends JDRegister {
    read(): number[]
    write(v: number[]): void
}

declare class JDEvent extends JDPacketInfo {
    sub(handler: () => void): void
}

declare function upload(label: string, ...args: number[]): void
declare function print(fmt: string, ...args: number[]): void
declare function format(fmt: string, ...args: number[]): string
declare function wait(seconds: number): void
declare function every(seconds: number, callback: () => void): void
declare function panic(code: number): never
