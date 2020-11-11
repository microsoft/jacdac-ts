import React, { } from 'react';
// tslint:disable-next-line: no-submodule-imports
import { Card, CardActions, CardContent, CardHeader, Typography } from '@material-ui/core';
import { useGithubRepository } from './github';

export default function GithubRepositoryCard(props: { repo: string }) {
    const { repo } = props;
    const { response, loading, status } = useGithubRepository(repo);

    return <Card>
        {response &&
            <CardHeader
                title={response && response.full_name}
            />}
        <CardContent>
            {response && <Typography>{response.description}</Typography>}
        </CardContent>
        <CardActions>
            
        </CardActions>
    </Card>
}