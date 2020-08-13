export class Example {
    label: string;
    constructor(
        public readonly timestamp: number,
        public readonly data: number[]
    ) {

    }

    toVector(): number[] {
        return [this.timestamp].concat(this.data)
    }
}

export class DataSet {
    readonly id = Math.random().toString()
    readonly rows: Example[];
    readonly labels: string[];
    maxRows = -1;

    // maintain computed min/max to avoid recomputation
    mins: number[];
    maxs: number[];

    constructor(public readonly name: string, public readonly headers: string[], public readonly units: string[]) {
        this.rows = [];
        this.labels = [];
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

    addExample(timestamp: number, data: number[]) {
        this.rows.push(new Example(timestamp, data))
        // update mins and maxes
        if (!this.mins) {
            this.mins = data.slice(0)
            this.maxs = data.slice(0)
        } else {
            for (let i = 0; i < data.length; ++i) {
                this.mins[i] = Math.min(this.mins[i], data[i])
                this.maxs[i] = Math.max(this.maxs[i], data[i])
            }
        }

        if (this.maxRows > 0 && this.rows.length > this.maxRows * 1.1) {
            this.rows.shift();
        }
    }

    toCSV(sep: string = ",") {
        const allheaders = ["time", ...this.headers].join(sep)
        let csv = [allheaders]
        this.rows.forEach(row => csv.push(
            row.toVector().map(cell => cell !== undefined ? cell.toString() : "").join(sep)
        ))
        return csv.join('\n');
    }
}
