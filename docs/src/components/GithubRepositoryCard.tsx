import React, {  } from 'react';
// tslint:disable-next-line: no-submodule-imports
import { Card, CardContent } from '@material-ui/core';
import { useGithubRepository } from './github';

export default function GithubRepositoryCard(props: { repo: string }) {
    const { repo } = props;
    const { response, loading } = useGithubRepository(repo);

    return <Card>
        <CardContent>
            {loading && "..."}
            {response && response.name}
        </CardContent>
    </Card>
}