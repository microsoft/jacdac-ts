import React from 'react';
import { createStyles, GridList, GridListTile, GridListTileBar, makeStyles, Theme } from '@material-ui/core';
import { deviceSpecifications, imageDeviceOf } from '../../../src/dom/spec';
// tslint:disable-next-line: match-default-export-name no-submodule-imports
import InfoIcon from '@material-ui/icons/Info';
import Markdown from "./Markdown"
import { IconButton } from "gatsby-theme-material-ui";

const useStyles = makeStyles((theme: Theme) => createStyles({
    root: {
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
        overflow: 'hidden',
        backgroundColor: theme.palette.background.paper,
    },
    gridList: {
        width: 500,
        height: 450,
    },
    icon: {
        color: 'rgba(255, 255, 255, 0.54)',
    },
}),
);

function arrayShuffle<T>(a: T[]): T[] {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export default function DeviceSpecificationList(props: {
    count?: number,
    shuffle?: boolean
    requiredServiceClasses?: number[]
}) {
    const { count, shuffle, requiredServiceClasses } = props;
    const classes = useStyles();
    let specs = deviceSpecifications();
    // apply filters
    if (count !== undefined)
        specs = specs.slice(0, count)
    // filter by services
    if (requiredServiceClasses !== undefined)
        specs = specs.filter(spec => spec.services.every(srv => requiredServiceClasses.indexOf(srv) > -1))
    if (shuffle)
        arrayShuffle(specs)

    return <GridList cols={4}>
        {specs.map(spec => <GridListTile key={spec.id}>
            <img src={imageDeviceOf(spec)} alt={spec.name} />
            <GridListTileBar
                title={spec.name}
                subtitle={<Markdown source={spec.description.split('.', 2)[0] + '...'} />}
                actionIcon={<>
                    <IconButton to={`/devices/${spec.id}`} aria-label={`info about ${spec.name}`} className={classes.icon}>
                        <InfoIcon />
                    </IconButton>
                </>
                }
            />
        </GridListTile>)}
    </GridList>
}