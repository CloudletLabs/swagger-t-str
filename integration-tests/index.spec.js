'use strict';

let path = require('path');
let swaggerServer = require('swagger-server');
let STS = require('../');

let server = swaggerServer(path.join(__dirname, './swagger.yml'));

server.start(8081, {}, function(err, app) {
    console.log('Your REST API is now running at http://localhost:8081');

    server.mockDataStore.createResource('/api/info', '/api/info', {version: '1.1'});
    server.post('/auth_token', function (req, res, next) {
        if (req.header('Authorization') != 'qwe') return res.status(401).send('Unauthorized');
        res.status(200).json({auth_token: 'abc'});
    });

    let program = {
        protocol: 'http',
        host: 'localhost',
        port: '8081',
        spec: './integration-tests/swagger.yml'
    };
    let sts = new STS(program);
    sts.start(function(failures){
        app.close();
        process.exit(failures);
    });
});

