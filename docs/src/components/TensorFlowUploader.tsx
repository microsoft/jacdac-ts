import { Grid, makeStyles, Theme, createStyles, CircularProgress } from '@material-ui/core';
import React, { useEffect, useState } from 'react';
import { SRV_TFLITE, TFLiteReg } from '../../../src/dom/constants';
import { JDService } from '../../../src/dom/service';
import ServiceList from './ServiceList';
import ConnectAlert from './ConnectAlert'
import { useDbUint8Array } from './DbContext'
import UploadButton from './UploadButton';
// tslint:disable-next-line: no-submodule-imports
import Alert from '@material-ui/lab/Alert';
import { Button } from 'gatsby-theme-material-ui';
import { TFLiteClient } from '../../../src/dom/tflite'
import RegisterInput from './RegisterInput';

const useStyles = makeStyles((theme: Theme) => createStyles({
    root: {
        marginBottom: theme.spacing(1)
    },
}))

function TensorFlowContent(props: { service: JDService }) {
    const { service } = props
    return <>
        <RegisterInput register={service.register(TFLiteReg.ModelSize)} />
        <RegisterInput register={service.register(TFLiteReg.LastError)} />
    </>
}

function TensorFlowActions(props: { service: JDService, model: Uint8Array }) {
    const { service, model } = props
    const [deploying, setDeploying] = useState(false)

    const disabled = !model || deploying
    const handleDeploy = async () => {
        try {
            setDeploying(true)
            const client = new TFLiteClient(service)
            await client.deployModel(model)
        }
        finally {
            setDeploying(false)
        }
    }

    return <div>
        <Button disabled={disabled} variant="contained" color="primary" onClick={handleDeploy}>Upload</Button>
        {deploying && <CircularProgress />}
    </div>
}

export default function TensorFlowUploader(props: {}) {
    const classes = useStyles()
    const [importing, setImporting] = useState(false)
    const { data: model, setBlob } = useDbUint8Array("model.tflite")

    const handleFiles = async (files: FileList) => {
        const file = files.item(0)
        if (file) {
            try {
                setImporting(true)
                await setBlob(file)
            } finally {
                setImporting(false)
            }
        }
    }

    return <div className={classes.root}>
        <h3>Load a TensorFlow Lite model</h3>
        {model && <Alert severity={'success'}>Model loaded ({model.byteLength >> 10}kb)</Alert>}
        {model && <hr />}
        <p>TensorFlow Lite models are typically stored in a <code>.tflite</code> file.</p>
        <UploadButton disabled={importing} text={"Import TFLITE file"} onFilesUploaded={handleFiles} />
        <h3>Deploy model to TensorFlow Lite services</h3>
        <ConnectAlert serviceClass={SRV_TFLITE} />
        <ServiceList
            serviceClass={SRV_TFLITE}
            content={service => <TensorFlowContent service={service} />}
            actions={service => <TensorFlowActions service={service} model={model} />}
        />
    </div>
}