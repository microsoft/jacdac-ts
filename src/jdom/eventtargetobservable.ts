import { Observable, Observer } from "./observable"

export class EventTargetObservable<TEvent> implements Observable<TEvent> {
    constructor(
        public readonly element: EventTarget,
        public readonly eventName: string
    ) {}

    subscribe(observer: Observer<TEvent>): { unsubscribe: () => void } {
        const handler: EventListener = (ev: Event) =>
            !!observer.next && observer.next(<TEvent>(<any>ev))
        this.element.addEventListener(this.eventName, handler, false)
        return {
            unsubscribe: () =>
                this.element.removeEventListener(this.eventName, handler),
        }
    }
}
