import React, { useContext } from 'react';
// tslint:disable-next-line: no-submodule-imports
import { createStyles, makeStyles, Theme } from '@material-ui/core/styles';
// tslint:disable-next-line: no-submodule-imports
import InputLabel from '@material-ui/core/InputLabel';
// tslint:disable-next-line: no-submodule-imports
import MenuItem from '@material-ui/core/MenuItem';
// tslint:disable-next-line: no-submodule-imports
import FormHelperText from '@material-ui/core/FormHelperText';
// tslint:disable-next-line: no-submodule-imports
import FormControl from '@material-ui/core/FormControl';
// tslint:disable-next-line: no-submodule-imports
import Select from '@material-ui/core/Select';
import { JDEvent } from '../../../src/dom/event';
import JacdacContext from '../../../src/react/Context';
import useChange from '../jacdac/useChange';
import clsx from 'clsx';

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        formControl: {
            minWidth: 120,
        },
        selectEmpty: {
            marginTop: theme.spacing(2),
        },
    }),
);

export default function EventSelect(props: { eventId: string, onChange: (eventId: string) => void, label: string, filter?: (event: JDEvent) => boolean, className?: string }) {
    const { eventId, onChange, label, filter, className } = props
    const { bus } = useContext(JacdacContext)
    const classes = useStyles();
    const events = useChange(bus, () => bus.devices()
        .map(device => device.services()
            .map(service => service.events)
            .reduce((l, r) => l.concat(r), [])
        )
        .reduce((l, r) => l.concat(r), [])
    ).filter(event => !filter || filter(event))
    const selectedEvent = bus.node(eventId) as JDEvent

    const handleChange = (ev: React.ChangeEvent<{ value: string }>) => {
        onChange(ev.target.value);
    };

    return (
        <FormControl variant="outlined" className={clsx(className, classes.formControl)}>
            <InputLabel>{label}</InputLabel>
            <Select
                value={eventId}
                onChange={handleChange}
                label={selectedEvent?.qualifiedName}>
                <MenuItem value={""}>
                    <em>None</em>
                </MenuItem>
                {events.map(ev => <MenuItem key={ev.id} value={ev.id}>{ev.qualifiedName}</MenuItem>)}
            </Select>
        </FormControl>
    );
}