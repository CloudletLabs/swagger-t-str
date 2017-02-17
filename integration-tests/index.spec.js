'use strict';

let chai = require('chai');
let expect = chai.expect;
let chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);

let express = require('express');

let STS = require('../');

let suites = ['sanity', 'security', 'parameters', 'failResponse', 'failSchema'];

let startServer = function (name, app) {
    return new Promise(function (resolve) {
        let server = app.listen(8081, function() {
            let sts = new STS('http://localhost:8081', `./integration-tests/${name}/swagger.yml`);
            //noinspection JSIgnoredPromiseFromCall
            sts.start(function(failures){
                server.close();
                resolve(failures);
            });
        });
    });
};

describe('Integration testing', function () {
    for (let name of suites) {
        it(name, function () {
            let app = express();
            let suite = require(`./${name}/`);
            let expectedFailures = suite(app);
            return expect(startServer(name, app)).eventually.become(expectedFailures);
        });
    }
});
