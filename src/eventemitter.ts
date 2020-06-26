import { SMap } from "./utils";

export type EventHandler = (evt: any) => void;
export class EventEmitter {
    readonly handlers: SMap<EventHandler[]> = {};

    constructor() {
    }

    /**
     * Registers an event handler
     * @param type 
     * @param handler 
     */
    on(type: string, handler: EventHandler): boolean {
        if (!type || !handler) return false;

        const hs = this.handlers[type] || (this.handlers[type] = []);
        if (hs.indexOf(handler) > -1) return false;

        hs.push(handler);
        return true;
    }

    off(type: string, handler: EventHandler) {
        if (!type || !handler) return false;

        const hs = this.handlers[type];
        const index = hs.indexOf(handler);
        if (index > -1) return false;

        hs.splice(index, -1);
        return true;
    }

    emit(type: string, evt?: any) {
        const hs = this.handlers[type];
        if (hs)
            for (const h of hs)
                h(evt);
    }
}