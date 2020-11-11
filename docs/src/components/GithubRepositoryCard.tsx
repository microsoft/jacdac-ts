import React, { } from 'react';
// tslint:disable-next-line: no-submodule-imports
import { Box, Card, CardActions, CardContent, CardHeader, Link, Typography } from '@material-ui/core';
import { useGithubRepository } from './github';

export default function GithubRepositoryCard(props: { repo: string }) {
    const { repo } = props;
    const { response, loading, status } = useGithubRepository(repo);

    return <Card>
        {response &&
            <CardHeader
                title={<>
                    <Link href={response.organization.html_url}>
                        <Typography component="span" variant="h6">{response.organization.login}</Typography>
                    </Link>
                    <Box component="span" ml={0.2} mr={0.2}>/</Box>
                    <Link href={response.html_url}>                    
                        {response.name}
                    </Link>
                </>} 
            />}
        <CardContent>
            {response && <Typography>{response.description}</Typography>}
        </CardContent>
        <CardActions>

        </CardActions>
    </Card>
}