import { JDBus } from "../../../src/dom/bus";
import { JDField } from "../../../src/dom/field";
import { SensorAggregatorConfig, sensorConfigToCSV } from "../../../src/dom/sensoraggregatorclient"

export class Example {
    label: string;
    constructor(
        public readonly timestamp: number,
        public readonly data: number[]
    ) {

    }

    toVector(startTimestamp?: number): number[] {
        const t = this.timestamp - (startTimestamp || 0)
        return [t].concat(this.data)
    }
}

export default class FieldDataSet {
    readonly id = Math.random().toString()
    readonly rows: Example[];
    readonly headers: string[];
    readonly units: string[];
    maxRows = -1;

    // maintain computed min/max to avoid recomputation
    mins: number[];
    maxs: number[];

    constructor(
        public readonly bus: JDBus,
        public readonly name: string,
        public readonly fields: JDField[],
        public readonly colors: string[],
        public readonly sensorConfig?: SensorAggregatorConfig
    ) {
        this.rows = [];
        this.headers = fields.map(field => field.friendlyName)
        this.units = fields.map(field => field.unit)
    }

    get startTimestamp() {
        const row = this.rows[0]
        return row?.timestamp
    }

    get duration() {
        const first = this.rows[0]
        const last = this.rows[this.rows.length - 1]
        return (first && last && last.timestamp - first.timestamp) || 0
    }

    get length() {
        return this.rows.length
    }

    indexOf(field: JDField) {
        return this.fields.indexOf(field)
    }

    colorOf(field: JDField) {
        return this.colors[this.indexOf(field)]
    }

    addRow(data?: number[]) {
        const timestamp = this.bus.timestamp;
        if (!data)
            data = this.fields.map(f => f.value)
        this.addExample(timestamp, data)
    }

    private addExample(timestamp: number, data: number[]) {
        this.rows.push(new Example(timestamp, data))

        // drop rows if needed
        let refreshminmax = false;
        while (this.maxRows > 0 && this.rows.length > this.maxRows * 1.1) {
            const d = this.rows.shift();
            refreshminmax = true;
        }

        if (refreshminmax) {
            // refresh entire mins/max
            for (let r = 0; r < this.rows.length; ++r) {
                const row = this.rows[r];
                if (r == 0) {
                    this.mins = row.data.slice(0)
                    this.maxs = row.data.slice(0)
                } else {
                    for (let i = 0; i < row.data.length; ++i) {
                        this.mins[i] = Math.min(this.mins[i], row.data[i])
                        this.maxs[i] = Math.max(this.maxs[i], row.data[i])
                    }
                }
            }
        }
        else {
            // incremental update
            if (!this.mins) {
                this.mins = data.slice(0)
                this.maxs = data.slice(0)
            } else {
                for (let i = 0; i < data.length; ++i) {
                    this.mins[i] = Math.min(this.mins[i], data[i])
                    this.maxs[i] = Math.max(this.maxs[i], data[i])
                }
            }
        }
    }

    toCSV(sep: string = ",") {
        const allheaders = ["time", ...this.headers].join(sep)
        const allunits = ["ms", ...this.units].join(sep)
        const start = this.startTimestamp
        let csv: string[] = []
        if (this.sensorConfig) {
            // inline sensor configuration
            const config = sensorConfigToCSV(this.sensorConfig)
                .map(line => line.join(sep))
            csv = csv.concat(config)
            // add header
            csv = csv.concat([])
            csv = csv.concat(["data"])
        }
        csv.push(allheaders)
        csv.push(allunits)
        this.rows.forEach(row => csv.push(
            row.toVector(start).map(cell => cell !== undefined ? cell.toString() : "").join(sep)
        ))
        return csv.join('\n');
    }
}
