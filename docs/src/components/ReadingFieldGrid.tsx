import { Card, CardActions, CardContent, CardHeader, createStyles, Grid, makeStyles, Switch, Theme } from "@material-ui/core";
import React from "react";
import { JDRegister } from "../../../src/dom/register";
import DeviceActions from "./DeviceActions";
import useGridBreakpoints from "./useGridBreakpoints";
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import FiberManualRecordIcon from '@material-ui/icons/FiberManualRecord';
import FieldDataSet from "./FieldDataSet";

const useStyles = makeStyles((theme: Theme) => createStyles({
    vmiddle: {
        verticalAlign: "middle"
    }
}));

export default function ReadingFieldGrid(props: {
    readingRegisters: JDRegister[],
    registerIdsChecked: string[],
    recording?: boolean,
    handleRegisterCheck: (register: JDRegister) => void,
    liveDataSet: FieldDataSet
}) {
    const { readingRegisters, registerIdsChecked, recording, handleRegisterCheck, liveDataSet } = props
    const classes = useStyles();
    const gridBreakpoints = useGridBreakpoints();
    const handleCheck = (register: JDRegister) => () => handleRegisterCheck(register)

    return <Grid container spacing={2}>
        {readingRegisters.map(register => {
            const registerChecked = registerIdsChecked.indexOf(register.id) > -1;
            return <Grid item {...gridBreakpoints} key={'source' + register.id}>
                <Card>
                    <CardHeader subheader={register.service.name}
                        title={`${register.service.device.name}/${register.name}`}
                        action={<DeviceActions device={register.service.device} reset={true} />} />
                    <CardContent>
                        {register.fields.map((field) => <span key={field.id}>
                            <FiberManualRecordIcon className={classes.vmiddle} fontSize="large" style={({
                                color: registerChecked ? liveDataSet.colorOf(field) : "#ccc"
                            })} />
                            {field.name}
                        </span>)}
                    </CardContent>
                    <CardActions>
                        <Switch disabled={recording} onChange={handleCheck(register)} checked={registerChecked} />
                    </CardActions>
                </Card>
            </Grid>;
        })}
    </Grid>
}