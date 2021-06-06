export const VM_ERROR = "vmError"
export const VM_WATCH_CHANGE = "vmWatchChange"
export const VM_BREAKPOINT = "vmBreakpoint"
export const VM_COMMAND_ATTEMPTED = "vmCommandAttempted"
export const VM_COMMAND_COMPLETED = "vmCommandCompleted"
export const VM_WAKE_SLEEPER = "vmWakeSleeper"

export class VMError extends Error {
    constructor(message: string, readonly jacdacName?: string) {
        super(message)
        this.name = VM_ERROR
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
