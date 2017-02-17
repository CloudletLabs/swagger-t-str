'use strict';

module.exports = function (app) {
    app.get('/api/user', function (req, res) {
        res.status(200).json({username: 'usernameFromGet'});
    });
    app.get('/api/user/:username', function (req, res) {
        //noinspection JSUnresolvedVariable
        if (req.params.username != 'usernameFromGet') return res.status(500).send('Internal app error');
        res.status(200).send();
    });
    app.delete('/api/user/:username', function (req, res) {
        if (req.params.username != 'usernameInMethod' &&
            req.params.username != 'usernameInExample') return res.status(500).send('Internal app error');
        res.status(200).send();
    });

    return 0;
};

