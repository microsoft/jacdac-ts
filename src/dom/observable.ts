import { EventEmitter } from "./eventemitter";
import { ERROR } from "./constants";

export interface Observer<T> {
    next?: (value: T) => void;
    error?: (error: Error) => void;
    complete?: () => void;
}

export interface Observable<T> {
    subscribe(observer: Observer<T>): {
        unsubscribe: () => void;
    };
}

export class EventObservable<T> implements Observable<T> {
    constructor(public eventEmitter: EventEmitter, public eventName: string) {
    }

    subscribe(observer: Observer<T>) {
        this.eventEmitter.on(this.eventName, observer.next)
        this.eventEmitter.on(ERROR, observer.error)
        // never completes
        return {
            unsubscribe: () => {
                this.eventEmitter.off(this.eventName, observer.next);
                this.eventEmitter.off(ERROR, observer.error)
            }
        }
    }
}

export function fromEvent<T>(eventEmitter: EventEmitter, eventName: string) {
    return new EventObservable<T>(eventEmitter, eventName)
}
