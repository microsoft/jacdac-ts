namespace microbit {
    function mapEventValue(v: number) {
        switch(v) {
            case DAL.ACCELEROMETER_EVT_FACE_UP: return jacdac.AccelerometerEvent.FaceUp;
            case DAL.ACCELEROMETER_EVT_FACE_DOWN: return jacdac.AccelerometerEvent.FaceDown;
            case DAL.ACCELEROMETER_EVT_TILT_UP: return jacdac.AccelerometerEvent.TiltUp;
            case DAL.ACCELEROMETER_EVT_TILT_DOWN: return jacdac.AccelerometerEvent.TiltDown;
            case DAL.ACCELEROMETER_EVT_TILT_LEFT: return jacdac.AccelerometerEvent.TiltLeft;
            case DAL.ACCELEROMETER_EVT_TILT_RIGHT: return jacdac.AccelerometerEvent.TiltRight;
            case DAL.ACCELEROMETER_EVT_FREEFALL: return jacdac.AccelerometerEvent.Freefall;
            case DAL.ACCELEROMETER_EVT_SHAKE: return jacdac.AccelerometerEvent.Shake;
            case DAL.ACCELEROMETER_2G_TOLERANCE: return jacdac.AccelerometerEvent.Force_2g;
            case DAL.ACCELEROMETER_3G_TOLERANCE: return jacdac.AccelerometerEvent.Force_3g;
            case DAL.ACCELEROMETER_6G_TOLERANCE: return jacdac.AccelerometerEvent.Force_6g;
            case DAL.ACCELEROMETER_8G_TOLERANCE: return jacdac.AccelerometerEvent.Force_8g;
        }
        return -1;
    }

    export class Accelerometer extends jacdac.SensorHost {
        private lastEvent: number = -1;
        constructor() {
            super("microbitAccel", jacdac.SRV_ACCELEROMETER);
            control.onEvent(EventBusSource.MICROBIT_ID_ACCELEROMETER, EventBusValue.MICROBIT_EVT_ANY, 
                () => {    
                    if (!this.running)
                        return;
                    let e = mapEventValue(control.eventValue());
                    if (e != -1 && e != this.lastEvent) {
                        this.lastEvent = e;
                        // TODO: this results in a 980 error
                        // this.sendEvent(e);
                    }
                }
            )
        }

        public serializeState(): Buffer {
            let ax = input.acceleration(Dimension.X);
            let ay = input.acceleration(Dimension.Y);
            let az = input.acceleration(Dimension.Z);
            // TODO: proper conversion
            return jacdac.jdpack("i12.20 i12.20 i12.20", [ax, ay, az]);
        }
    }
}
