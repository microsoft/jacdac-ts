import { SMap } from "./utils";
import { NEW_LISTENER, REMOVE_LISTENER, ERROR, CHANGE } from "./constants";
import { Observable, Observer } from "./observable";
export type EventHandler = (...args) => void;

interface Listener {
    handler: EventHandler;
    once: boolean;
}

function normalizeEventNames(eventNames: string | string[]): string[] {
    if (!eventNames)
        eventNames = [];
    if (typeof eventNames == "string")
        eventNames = [eventNames]
    return eventNames;
}

export abstract class JDNode {
    readonly listeners: SMap<Listener[]> = {};
    changeId = 0;

    constructor() {
    }

    /**
     * Globally unique identifier per GraphQL spec
     */
    abstract get id(): string;

    /**
     * Gets a kind identifier useful for UI descriptions
     */
    abstract get nodeKind(): string;

    on(eventName: string | string[], handler: EventHandler) {
        normalizeEventNames(eventName)
            .forEach(eventName => this.addListenerInternal(eventName, handler, false));
        return this;
    }

    off(eventName: string | string[], handler: EventHandler) {
        normalizeEventNames(eventName)
            .forEach(eventName => this.removeListenerInternval(eventName, handler))
        return this;
    }

    once(eventName: string | string[], handler: EventHandler) {
        normalizeEventNames(eventName)
            .forEach(eventName => this.addListenerInternal(eventName, handler, true));
        return this;
    }

    protected log(msg: any) {
        console.log(`${this}: ${msg}`)
    }

    private addListenerInternal(eventName: string, handler: EventHandler, once: boolean) {
        if (!eventName || !handler) return this;

        const listeners = this.listeners[eventName] || (this.listeners[eventName] = []);
        const listener = listeners.find(listener => listener.handler == handler)
        if (listener) {
            listener.once = !!once;
            return;
        }

        this.emit(NEW_LISTENER, eventName, handler)
        listeners.push({
            handler,
            once: !!once
        })
    }

    private removeListenerInternval(eventName: string, handler: EventHandler): JDNode {
        if (!eventName || !handler) return this;

        const listeners = this.listeners[eventName]
        if (listeners) {
            for (let i = 0; i < listeners.length; ++i) {
                const listener = listeners[i];
                if (handler === listener.handler) {
                    listeners.splice(i, 1);
                    --i;
                    if (listeners.length == 0)
                        delete this.listeners[eventName];
                    this.emit(REMOVE_LISTENER, eventName, handler);
                    return this;
                }
            }
        }
        return this;
    }

    /**
     * Synchronously calls each of the listeners registered for the event named eventName, in the order they were registered, passing the supplied arguments to each.
     * @param eventName 
     * @param args 
     */
    emit(eventName: string, ...args): boolean {
        if (!eventName) return false;

        if (eventName === CHANGE) {
            this.changeId++;
            //console.info(`node ${this.id} changed to ${this.changeId}`)
        }

        const listeners = this.listeners[eventName];
        if (!listeners || listeners.length == 0) {
            // report unhandled errors
            if (eventName == ERROR)
                console.error(args[0]);
            return false;
        }
        for (let i = 0; i < listeners.length; ++i) {
            const listener = listeners[i];
            const handler = listener.handler;
            if (listener.once) {
                listeners.splice(i, 1);
                --i;
            }
            try {
                handler.apply(null, args);
            }
            catch (e) {
                // avoid recursive errors in error handler
                if (eventName !== ERROR)
                    this.emit(ERROR, e)
            }
        }
        if (listeners.length == 0)
            delete this.listeners[eventName]
        return true;
    }

    listenerCount(eventName: string): number {
        if (!eventName) return 0;
        const listeners = this.listeners[eventName]
        return listeners ? listeners.length : 0
    }

    /**
     * Returns an array listing the events for which the emitter has registered listeners.
     */
    eventNames(): string[] {
        return Object.keys(this.listeners)
    }

    /**
     * Creates an observable from the given event
     * @param eventName 
     */
    observe<T>(eventName: string | string[]): Observable<T> {
        return fromEvent<T>(this, eventName);
    }

    /**
     * Subscribbes to an event and returns the unsubscription handler
     * @param eventName 
     * @param next 
     */
    subscribe<T>(eventName: string | string[], next: (value: T) => void): () => void {
        const observer = this.observe<T>(eventName);
        return observer.subscribe({ next }).unsubscribe
    }
}

class EventObservable<T> implements Observable<T> {
    constructor(public eventEmitter: JDNode, public eventNames: string[]) {
    }

    subscribe(observer: Observer<T>) {
        //console.log(`on ${this.eventName}`)
        this.eventEmitter.on(this.eventNames, observer.next)
        this.eventEmitter.on(ERROR, observer.error)
        // never completes
        return {
            unsubscribe: () => {
                //console.log(`off ${this.eventName}`)
                this.eventEmitter.off(this.eventNames, observer.next);
                this.eventEmitter.off(ERROR, observer.error)
            }
        }
    }
}

export function fromEvent<T>(eventEmitter: JDNode, eventNames: string | string[]): Observable<T> {
    return new EventObservable<T>(eventEmitter, normalizeEventNames(eventNames))
}
