'use strict';

module.exports = function (app) {
    app.get('/api/info', function (req, res) {
        res.status(200).json({version: '1.1'});
    });

    return 1;
};
