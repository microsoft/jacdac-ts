import { SMap } from "./utils";
import { NEW_LISTENER, REMOVE_LISTENER, ERROR, CHANGE } from "./constants";
import { Observable, Observer } from "./observable";
import Flags from "./flags";

export type EventHandler = (...args) => void;

interface Listener {
    handler: EventHandler;
    once: boolean;
    stackTrace?: string;
}

function normalizeEventNames(eventNames: string | string[]): string[] {
    if (!eventNames)
        eventNames = [];
    if (typeof eventNames === "string")
        eventNames = [eventNames]
    return eventNames;
}

export class JDEventSource {
    private readonly listeners: SMap<Listener[]> = {};
    readonly eventStats: SMap<number> = {};
    newListenerStats: SMap<number> = undefined;

    constructor() {
    }

    on(eventName: string | string[], handler: EventHandler) {
        normalizeEventNames(eventName)
            .forEach(eventName => this.addListenerInternal(eventName, handler, false));
        return this;
    }

    off(eventName: string | string[], handler: EventHandler) {
        normalizeEventNames(eventName)
            .forEach(eventName => this.removeListenerInternal(eventName, handler))
        return this;
    }

    once(eventName: string | string[], handler: EventHandler) {
        normalizeEventNames(eventName)
            .forEach(eventName => this.addListenerInternal(eventName, handler, true));
        return this;
    }

    private addListenerInternal(eventName: string, handler: EventHandler, once: boolean) {
        if (!eventName || !handler) {
            return this;
        }

        const eventListeners = this.listeners[eventName] || (this.listeners[eventName] = []);
        const listener = eventListeners.find(listener => listener.handler === handler)
        if (listener) {
            listener.once = !!once;
            return;
        }

        eventListeners.push({
            handler,
            once: !!once,
            // debug only collection of trace for leak detection
            stackTrace: Flags.diagnostics && new Error().stack
        })
        this.emit(NEW_LISTENER, eventName, handler)
        // diagnostics
        if (Flags.diagnostics) {
            if (!this.newListenerStats)
                this.newListenerStats = {};
            this.newListenerStats[eventName] = (this.newListenerStats[eventName] || 0) + 1;
        }
    }

    private removeListenerInternal(eventName: string, handler: EventHandler): void {
        if (!eventName || !handler) return;

        const eventListeners = this.listeners[eventName]
        if (eventListeners) {
            for (let i = 0; i < eventListeners.length; ++i) {
                const listener = eventListeners[i];
                if (handler === listener.handler) {
                    eventListeners.splice(i, 1);
                    this.emit(REMOVE_LISTENER, eventName, handler);
                    return;
                }
            }
        }
    }

    /**
     * Synchronously calls each of the listeners registered for the event named eventName, in the order they were registered, passing the supplied arguments to each.
     * @param eventName 
     * @param args 
     */
    emit(eventName: string, ...args): boolean {
        if (!eventName) return false;

        // track event stats
        this.eventStats[eventName] = (this.eventStats[eventName] || 0) + 1;

        const eventListeners = this.listeners[eventName];
        if (!eventListeners || eventListeners.length == 0) {
            // report unhandled errors
            if (eventName == ERROR)
                console.error(args[0]);
            return false;
        }
        for (let i = 0; i < eventListeners.length; ++i) {
            const listener = eventListeners[i];
            const handler = listener.handler;
            if (listener.once) {
                eventListeners.splice(i, 1);
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
        return true;
    }

    listenerCount(eventName: string): number {
        if (!eventName) return 0;
        const listeners = this.listeners[eventName]
        return listeners?.length || 0
    }

    listenerStackTraces(eventName: string): string[] {
        const listeners = this.listeners[eventName]
        return listeners?.map(listener => listener.stackTrace);
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

    get changeId() {
        return this.eventStats[CHANGE] || 0;
    }
}

class EventObservable<T> implements Observable<T> {
    constructor(public readonly eventEmitter: JDEventSource, public readonly eventNames: string[]) {
        //console.log(`obs`, this.eventNames)
    }

    subscribe(observer: Observer<T>) {
        //console.log(`on`, this.eventNames, observer)
        if (observer.next) this.eventEmitter.on(this.eventNames, observer.next)
        if (observer.error) this.eventEmitter.on(ERROR, observer.error)
        // never completes
        return {
            unsubscribe: () => {
                //console.log(`off`, this.eventNames, observer)
                if (observer.next) this.eventEmitter.off(this.eventNames, observer.next);
                if (observer.error) this.eventEmitter.off(ERROR, observer.error)
            }
        }
    }
}

export function fromEvent<T>(eventEmitter: JDEventSource, eventNames: string | string[]): Observable<T> {
    return new EventObservable<T>(eventEmitter, normalizeEventNames(eventNames))
}
