'use strict';

module.exports = function (app) {
    app.post('/api/auth_token', function (req, res) {
        if (req.header('Authorization') != 'Basic YmFzaWNVc2VybmFtZTpiYXNpY1Bhc3N3b3Jk')
            return res.status(401).send('Unauthorized');
        res.status(200).header('auth', 'header').json({auth_token: 'token_1'});
    });
    app.put('/api/auth_token', function (req, res) {
        if (req.header('Authorization') != 'Basic header') return res.status(401).send('Unauthorized');
        if (req.header('AuthToken') != 'Bearer token_1') return res.status(401).send('Unauthorized');
        res.status(200).json({auth_token: 'token_2'});
    });
    app.delete('/api/auth_token', function (req, res) {
        if (req.header('AuthToken') != 'Bearer token_2') return res.status(401).send('Unauthorized');
        res.status(200).send();
    });

    return 0;
};

