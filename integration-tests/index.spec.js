'use strict';

let path = require('path');
let fs = require('fs');
let express = require('express');
let app = express();

let STS = require('../');

app.get('/api/status', function (req, res) {
    res.status(200).send();
});
app.get('/api/info', function (req, res) {
    if (req.header('Authorization') != 'Basic cXdlOnF3ZQ==') return res.status(401).send('Unauthorized');
    res.status(200).json({version: '1.1'});
});
app.post('/api/auth_token', function (req, res) {
    if (req.header('Authorization') != 'Basic qwe') return res.status(401).send('Unauthorized');
    res.status(200).json({auth_token: 'abc'});
});
app.put('/api/auth_token/:token', function (req, res) {
    if (req.header('Authorization') != 'Bearer abc') return res.status(401).send('Unauthorized');
    if (req.params.token != 'abc') return res.status(500).send('Internal app error');
    res.status(200).json({auth_token: 'xyz'});
});
app.delete('/api/auth_token/:token', function (req, res) {
    if (req.header('Authorization') != 'Bearer xyz') return res.status(401).send('Unauthorized');
    if (req.params.token != 'xyz') return res.status(500).send('Internal app error');
    res.status(200).send();
});

let server = app.listen(8081, function() {
    console.log('Your REST API is now running at http://localhost:8081');

    let sts = new STS('http://localhost:8081', './integration-tests/swagger.yml');
    sts.start(function(failures){
        server.close();
        process.exit(failures);
    });
});

