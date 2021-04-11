namespace modules {
    /**
     * A roving robot.
     **/
    //% fixedInstances blockGap=8
    export class RoverClient extends jacdac.SensorClient<[number,number,number,number,number]> {
            

        constructor(role: string) {
            super(jacdac.SRV_ROVER, role, "i16.16 i16.16 i16.16 i16.16 i16.16");
            
        }
    

        /**
        * The current position and orientation of the robot.
        */
        //% callInDebugger
        //% group="Rover"
        //% block="%rover x"
        //% blockId=jacdac_rover_kinematics_x_get
        //% weight=100
        x(): number {
            this.setStreaming(true);            
            const values = this._reading.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * The current position and orientation of the robot.
        */
        //% callInDebugger
        //% group="Rover"
        //% block="%rover y"
        //% blockId=jacdac_rover_kinematics_y_get
        //% weight=99
        y(): number {
            this.setStreaming(true);            
            const values = this._reading.pauseUntilValues() as any[];
            return values[1];
        }

        /**
        * The current position and orientation of the robot.
        */
        //% callInDebugger
        //% group="Rover"
        //% block="%rover vx"
        //% blockId=jacdac_rover_kinematics_vx_get
        //% weight=98
        vx(): number {
            this.setStreaming(true);            
            const values = this._reading.pauseUntilValues() as any[];
            return values[2];
        }

        /**
        * The current position and orientation of the robot.
        */
        //% callInDebugger
        //% group="Rover"
        //% block="%rover vy"
        //% blockId=jacdac_rover_kinematics_vy_get
        //% weight=97
        vy(): number {
            this.setStreaming(true);            
            const values = this._reading.pauseUntilValues() as any[];
            return values[3];
        }

        /**
        * The current position and orientation of the robot.
        */
        //% callInDebugger
        //% group="Rover"
        //% block="%rover heading"
        //% blockId=jacdac_rover_kinematics_heading_get
        //% weight=96
        heading(): number {
            this.setStreaming(true);            
            const values = this._reading.pauseUntilValues() as any[];
            return values[4];
        }

    
    }
    //% fixedInstance whenUsed block="rover 1"
    export const rover1 = new RoverClient("rover1");
}