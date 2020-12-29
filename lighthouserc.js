module.exports = {
    ci: {
        collect: {
            startServerCommand: 'npm run docsserve',
            url: ['http://localhost:8000/'],
        },
        upload: {
            target: 'temporary-public-storage',
        },
    },
};