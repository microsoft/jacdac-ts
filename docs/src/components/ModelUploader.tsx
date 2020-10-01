import { makeStyles, Theme, createStyles, CircularProgress } from '@material-ui/core';
import React, { useState } from 'react';
import { SRV_SENSOR_AGGREGATOR, SRV_MODEL_RUNNER, ModelRunnerReg } from '../../../src/dom/constants';
import { JDService } from '../../../src/dom/service';
import ServiceList from './ServiceList';
import ConnectAlert from './ConnectAlert'
import { useDbJSON, useDbUint8Array } from './useDb'
import UploadButton from './UploadButton';
// tslint:disable-next-line: no-submodule-imports
import Alert from "./Alert";
import { Button } from 'gatsby-theme-material-ui';
import { ModelRunnerClient } from '../../../src/dom/modelrunner'
import RegisterInput from './RegisterInput';
import CircularProgressWithLabel from './CircularProgressWithLabel'
import { SensorAggregatorClient, SensorAggregatorConfig } from '../../../src/dom/sensoraggregatorclient';
import SensorAggregatorConfigView from './SensorAggregatorConfigView';

const useStyles = makeStyles((theme: Theme) => createStyles({
    root: {
        marginBottom: theme.spacing(1)
    },
}))

export function ModelContent(props: { service: JDService }) {
    const { service } = props
    return <>
        <RegisterInput register={service.register(ModelRunnerReg.ModelSize)} />
        <RegisterInput register={service.register(ModelRunnerReg.LastError)} />
    </>
}

export function ModelActions(props: {
    service: JDService,
    model: Uint8Array,
    sensorAggregatorService?: JDService,
    sensorInput?: SensorAggregatorConfig
}) {
    const { service, model, sensorAggregatorService, sensorInput } = props
    const [deploying, setDeploying] = useState(false)
    const [progress, setProgress] = useState(0)

    const modelDisabled = !service || !model || deploying

    const handleDeployModel = async () => {
        try {
            setDeploying(true)
            if (sensorAggregatorService && sensorInput) {
                const aggregator = new SensorAggregatorClient(sensorAggregatorService)
                await aggregator.setInputs(sensorInput)
            }
            if (service && model) {
                const runner = new ModelRunnerClient(service)
                await runner.deployModel(model, p => setProgress(p * 100))
            }
        }
        finally {
            setDeploying(false)
        }
    }

    return <>
        {!deploying && <Button disabled={modelDisabled} variant="contained" color="primary" onClick={handleDeployModel}>
            {sensorInput ? "Deploy model and configuration" : "Deploy model"}
        </Button>}
        {deploying && <CircularProgressWithLabel value={progress} />}
    </>
}

export default function ModelUploader(props: {}) {
    const classes = useStyles()
    const [importing, setImporting] = useState(false)
    const { data: model, setBlob: setModel } = useDbUint8Array("model.tflite")
    const { value: sensorConfig, setBlob: setSensorConfig } = useDbJSON<SensorAggregatorConfig>("sensor-input.json")

    const handleTfmodelFiles = async (files: FileList) => {
        const file = files.item(0)
        if (file) {
            try {
                setImporting(true)
                await setModel(file)
            } finally {
                setImporting(false)
            }
        }
    }

    const handleSensorConfigFiles = async (files: FileList) => {
        const file = files.item(0)
        if (file) {
            try {
                setImporting(true)
                console.log(file)
                await setSensorConfig(file)
            } finally {
                setImporting(false)
            }
        }
    }

    return <div className={classes.root}>
        <h3>Load a TensorFlow Lite model</h3>
        <p>TensorFlow Lite models are typically stored in a <code>.tflite</code> file.</p>
        {model && <Alert severity={'success'}>Model loaded ({model.byteLength >> 10}kb)</Alert>}
        {model && <p />}
        <UploadButton required={!model} disabled={importing} text={"Import model"} accept=".tflite" onFilesUploaded={handleTfmodelFiles} />
        <h3>Configure sensors</h3>
        <p>Sensor configuration files are stored in a <code>.json</code> file.</p>
        {sensorConfig && <Alert severity={'success'}>Sensor configuration loaded</Alert>}
        {sensorConfig && <SensorAggregatorConfigView config={sensorConfig} />}
        {sensorConfig && <p />}
        <UploadButton required={!sensorConfig} disabled={importing} text={"Import configuration"} accept=".json" onFilesUploaded={handleSensorConfigFiles} />
        <h3>Deploy model to TensorFlow Lite services</h3>
        <ConnectAlert serviceClass={SRV_MODEL_RUNNER} />
        <ServiceList
            serviceClass={SRV_MODEL_RUNNER}
            content={service => <ModelContent service={service} />}
            actions={service => <ModelActions
                service={service}
                model={model}
                sensorAggregatorService={service?.device.services({ serviceClass: SRV_SENSOR_AGGREGATOR })?.[0]}
                sensorInput={sensorConfig}
            />}
        />
    </div>
}