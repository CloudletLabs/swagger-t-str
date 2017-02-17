'use strict';

module.exports = function (app) {
    app.get('/api/user/:username', function (req, res) {
        if (req.params.username != 'usernameInPath') return res.status(500).send('Internal app error');
        res.status(200).send();
    });
    app.put('/api/user/:username', function (req, res) {
        if (req.params.username != 'usernameInMethod') return res.status(500).send('Internal app error');
        res.status(200).send();
    });
    app.delete('/api/user/:username', function (req, res) {
        if (req.params.username != 'usernameInExample') return res.status(500).send('Internal app error');
        res.status(200).send();
    });

    return 0;
};

