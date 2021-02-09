import React, { } from 'react';
// tslint:disable-next-line: no-submodule-imports
import { Box, Card, CardActions, CardContent, CardHeader, CircularProgress, Typography } from '@material-ui/core';
import { useLatestRelease, useRepository } from './github';
import GitHubIcon from '@material-ui/icons/GitHub';
import { Link } from 'gatsby-theme-material-ui';
import { inIFrame } from '../../../src/jdom/iframeclient';

export default function GithubRepositoryCardHeader(props: {
    slug: string,
    showRelease?: boolean
}) {
    const { slug, showRelease } = props;
    const { response: repo, loading: repoLoading } = useRepository(slug);
    const { response: release, loading: releaseLoading } = useLatestRelease(showRelease && slug);
    const iframe = inIFrame();
    const target = iframe ? "_blank" : ""

    const title = repo
        ? <>
            <Link href={repo.html_url} target={target}>
                <Typography component="span" variant="h6">{repo.organization.login}</Typography>
            </Link>
            <Box component="span" ml={0.5} mr={0.5}>/</Box>
            <Link href={repo.html_url} target={target}>
                <Typography component="span" variant="h5">{repo.name}</Typography>
            </Link>
        </> : <><Link href={`https://github.com/${slug}`} target={target}>
            <Typography component="span" variant="h6">{slug}</Typography>
        </Link>
            {!repoLoading && <Typography variant="caption">Unable to find repository</Typography>}
        </>;

    return <CardHeader
        title={title}
        subheader={release
            && <Link color="textSecondary" target="_blank" to={release.html_url}>{release.name}</Link>
        }
        avatar={<GitHubIcon />}
    />
}