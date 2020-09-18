import { Grid, makeStyles, Theme, createStyles } from '@material-ui/core';
import React, { useState } from 'react';
import { SRV_TFLITE } from '../../../src/dom/constants';
import { JDDevice } from '../../../src/dom/device';
import { JDNode } from '../../../src/dom/node';
import { JDService } from '../../../src/dom/service';
import useSelectedNodes from '../jacdac/useSelectedNodes';
import ServiceList from './ServiceList';

const useStyles = makeStyles((theme: Theme) => createStyles({
    root: {
        marginBottom: theme.spacing(1)
    },
}))

export default function TensorFlowUploader(props: {}) {
    const classes = useStyles()
    const { selected, toggleSelected } = useSelectedNodes<JDService>()

    return <div className={classes.root}>
        <h3>Choose the TensorFlow Lite services</h3>
        <ServiceList serviceClass={SRV_TFLITE} selected={selected} toggleSelected={toggleSelected} />
    </div>
}