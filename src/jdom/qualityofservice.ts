import { CHANGE } from "./constants";
import { JDEventSource } from "./eventsource";
import Packet from "./packet";

export class QualityOfService extends JDEventSource {
    private _receivedPackets = 0;
    private readonly _data: { received: number; total: number }[] =
        Array(10).fill(0).map(_ => ({ received: 0, total: 0, }));
    private _dataIndex = 0;

    constructor() {
        super();
    }

    /**
     * Average packet dropped per announce period
     */
    get dropped(): number {
        const r = this._data
            .filter(e => !!e.total) // ignore total 0
            .reduce((s, e) => s + (e.total - e.received), 0) / this._data.length || 0;
        return r;
    }

    processAnnouncement(pkt: Packet) {
        // collect metrics
        const received = this._receivedPackets;
        const total = pkt.data[2];

        this._data[this._dataIndex] = { received, total }
        this._dataIndex = (this._dataIndex + 1) % this._data.length;

        // reset counter
        this._receivedPackets = 0;
        this.emit(CHANGE);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    processPacket(pkt: Packet) {
        this._receivedPackets++;
    }
}
