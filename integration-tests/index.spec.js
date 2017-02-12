'use strict';

let path = require('path');
let swaggerServer = require('swagger-server');
let STS = require('../');

let server = swaggerServer(path.join(__dirname, './swagger.yml'));

server.start(8081, {}, function(err, app) {
    console.log('Your REST API is now running at http://localhost:8081');

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

