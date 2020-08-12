import React, { useState, useContext } from 'react';
// tslint:disable-next-line: no-submodule-imports
import { makeStyles, Theme } from '@material-ui/core/styles';
// tslint:disable-next-line: no-submodule-imports
import Tabs from '@material-ui/core/Tabs';
// tslint:disable-next-line: no-submodule-imports
import Tab from '@material-ui/core/Tab';
import { Paper, Grid } from '@material-ui/core';
import TabPanel, { a11yProps } from './TabPanel';
import DomTreeView from './DomTreeView';
import { JDRegister } from '../../../src/dom/register';
import JacdacContext from '../../../src/react/Context';
import RegisterInput from './RegisterInput'

const useStyles = makeStyles((theme: Theme) => ({
    root: {
        flexGrow: 1,
        backgroundColor: theme.palette.background.paper,
        marginBottom: theme.spacing(1)
    },
    pre: {
        margin: "0",
        padding: "0",
        backgroundColor: "transparent",
        whiteSpec: "pre-wrap"
    }
}));

export default function Collector(props: {}) {
    const { } = props;
    const { bus } = useContext(JacdacContext)
    const classes = useStyles();
    const [tab, setTab] = useState(0);
    const [registers, setRegisters] = useState<JDRegister[]>([])

    const handleTabChange = (event: React.ChangeEvent<{}>, newValue: number) => setTab(newValue);
    const handleRegisterChecked = (checked: string[]) => {
        const regs = checked.map(id => bus.node(id) as JDRegister).filter(reg => !!reg);
        console.log(regs)
        setRegisters(regs)
    }
    return (
        <div className={classes.root}>
            <Paper square>
                <Tabs value={tab} onChange={handleTabChange} aria-label="Configure data source, record data">
                    <Tab label="Data Sources" {...a11yProps(0)} />
                    <Tab label="Recorder" {...a11yProps(1)} />
                </Tabs>
                <TabPanel value={tab} index={0}>
                    <DomTreeView
                        checkboxes={["register"]}
                        serviceFilter={srv => !!srv.readingRegister}
                        eventFilter={ev => false}
                        registerFilter={reg => reg.isReading}
                        onChecked={handleRegisterChecked}
                    />
                </TabPanel>
                <TabPanel value={tab} index={1}>
                    <Grid container
                        spacing={2}>
                        {registers.map(register =>
                            <Grid item>
                                <RegisterInput register={register} showDeviceName={true} />
                            </Grid>)}
                    </Grid>
                </TabPanel>
            </Paper>
        </div>
    );
}
