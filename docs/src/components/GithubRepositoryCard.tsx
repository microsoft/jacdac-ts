import React, { } from 'react';
// tslint:disable-next-line: no-submodule-imports
import { Box, Card, CardActions, CardContent, CardHeader, CircularProgress, Typography } from '@material-ui/core';
import { useLatestRelease, useRepository } from './github';
import GitHubIcon from '@material-ui/icons/GitHub';
import { Link } from 'gatsby-theme-material-ui';

export default function GithubRepositoryCard(props: {
    slug: string,
    showRelease?: boolean,
    showDescription?: boolean,
    children?: any
}) {
    const { slug, showRelease, showDescription, children } = props;
    const { response: repo, loading: repoLoading } = useRepository(slug);
    const { response: release, loading: releaseLoading } = useLatestRelease(showRelease && slug);
    const description = showDescription && repo?.description;

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

    return <Card>
        <CardHeader
            title={title}
            subheader={release && <Link color="textSecondary" target="_blank" to={release.html_url}>{release.name}</Link>}
            avatar={<GitHubIcon />}
        />
        {(description || children) && <CardContent>
            {description && <Typography>{description}</Typography>}
            {children}
        </CardContent>}
        <CardActions>
            {(repoLoading || releaseLoading) && <CircularProgress disableShrink variant="indeterminate" size="1rem" />}
        </CardActions>
    </Card>
}