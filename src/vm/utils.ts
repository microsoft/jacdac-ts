import { VMCode } from "./events"

export class VMError extends Error {
    constructor(
        name: VMCode,
        readonly message: string,
        readonly jacdacName?: string
    ) {
        super(message)
        this.name = name
    }
}

export default function errorPath(e: VMError): string {
    return (e as VMError)?.jacdacName
}

export class Mutex {
    private promises: (() => Promise<any>)[] = []
    private shift() {
        this.promises.shift()
        if (this.promises[0]) this.promises[0]()
    }
    acquire<T>(f: () => Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            this.promises.push(() =>
                f().then(
                    v => {
                        this.shift()
                        resolve(v)
                    },
                    e => {
                        this.shift()
                        reject(e)
                    }
                )
            )
            if (this.promises.length == 1) this.promises[0]()
        })
    }
}
