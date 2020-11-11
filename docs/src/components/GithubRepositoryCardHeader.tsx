import React, { } from 'react';
// tslint:disable-next-line: no-submodule-imports
import { Box, Card, CardActions, CardContent, CardHeader, CircularProgress, Typography } from '@material-ui/core';
import { useLatestRelease, useRepository } from './github';
import GitHubIcon from '@material-ui/icons/GitHub';
import { Link } from 'gatsby-theme-material-ui';

export default function GithubRepositoryCardHeader(props: {
    slug: string,
    showRelease?: boolean
}) {
    const { slug, showRelease } = props;
    const { response: repo, loading: repoLoading } = useRepository(slug);
    const { response: release, loading: releaseLoading } = useLatestRelease(showRelease && slug);

    const title = repo
        ? <>
            <Link href={repo.organization.html_url}>
                <Typography component="span" variant="h6">{repo.organization.login}</Typography>
            </Link>
            <Box component="span" ml={0.5} mr={0.5}>/</Box>
            <Link href={repo.html_url}>
                <Typography component="span" variant="h5">{repo.name}</Typography>
            </Link>
        </> : <Typography>{repo}</Typography>;

    return <CardHeader
        title={title}
        subheader={release && <Link color="textSecondary" target="_blank" to={release.html_url}>{release.name}</Link>}
        avatar={<GitHubIcon />}
    />
}