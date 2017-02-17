'use strict';

let yaml = require('js-yaml');
let fs = require('fs');

let Mocha = require('mocha');

let SwaggerClient = require('swagger-client');

let STSExampleHandler = require('./STSExampleHandler');

module.exports = STS;

/**
 * This is used to find all methods inside the route excluding other properties.
 * @type {[*]}
 */
const knownHttpMethods = ['get','head','post','put','delete','connect','options','trace','patch'];

/**
 * Create new STS instance
 * @url URL to the API
 * @specPath path to the spec file
 * @constructor
 */
function STS(url, specPath) {
    this.url = url;
    this.specPath = specPath;
}

/**
 * Starting the process
 * @param callback
 * @returns {Promise.<integer>}
 */
STS.prototype.start = function (callback) {
    this.callback = callback;
    this.loadSpec();
    return this.createClient();
};

/**
 * Loading spec from a file
 */
STS.prototype.loadSpec = function () {
    this.spec = yaml.safeLoad(fs.readFileSync(this.specPath, 'utf8'));
};

/**
 * Creating swagger-client
 * @returns {Promise.<integer>}
 */
STS.prototype.createClient = function () {
    //noinspection JSUnresolvedFunction
    return new SwaggerClient({
        url: this.url,
        spec: this.spec,
        enableCookies: true,
        usePromise: true
    }).then(this.onClientReady()).catch(this.onClientError());
};

/**
 * Everything is ready to start with tests
 */
STS.prototype.onClientReady = function () {
    let self = this;
    return function (client) {
        self.client = client;
        self.exampleValidator = new STSExampleHandler(self.spec, client);
        self.buildRootSuite();
    };
};

/**
 * Error creating swagger-client
 */
STS.prototype.onClientError = function () {
    let self = this;
    return function (err) {
        console.error(err);
        self.callback(-1);
    };
};

/**
 * Find in self.client.default.operations for given route path:method
 * @param path
 * @param method
 * @returns {*}
 */
STS.prototype.findOperation = function (path, method) {
    let self = this;
    let operationName = Object.keys(self.client.default.operations).find(function (operationName) {
        let operation = self.client.default.operations[operationName];
        if (operation.path == path && operation.method == method) return true;
    });
    return self.client.default.operations[operationName];
};

/**
 * Sometimes operation.responses missing one of them.
 * It has been discovered that operation.successResponse is what we missing,
 *  but unfortunately this object missing our x-amples for some reason.
 * This function is a hack to return the list of responses,
 *  together with operation.successResponse and missing x-amples.
 * @param operation
 * @returns {*}
 */
STS.prototype.hackSuccessResponse = function (operation) {
    // Clone it since we don't want to affect anything
    let responses = Object.assign({}, operation.responses);
    if (operation.successResponse) {
        let responseCode = Object.keys(operation.successResponse)[0];
        let examples = this.spec.paths[operation.path][operation.method].responses[responseCode]['x-amples'];
        let response = Object.assign({ 'x-amples': examples }, operation.successResponse[responseCode]);
        let responseObject = {};
        responseObject[responseCode] = response;
        // We want successResponse to be the first in the list
        responses = Object.assign(responseObject, responses);
    }
    return responses;
};

/**
 * Parse specs and build mocha suite for each route:response
 */
STS.prototype.buildRootSuite = function () {
    let mocha = new Mocha();
    this.serverSuite = new Mocha.Suite(this.url + ': ' + this.client.info.title);
    mocha.suite.addSuite(this.serverSuite);
    // We wanted to use this.client.apis.default.operations
    // But this won't give us the same sorting as in original spec
    for (let path of Object.keys(this.client.swaggerObject.paths)) {
        if (!path.startsWith('/')) continue;
        this.handlePath(path);
    }
    mocha.run(this.callback);
};

/**
 * Handle given route path in the spec
 * @param path
 */
STS.prototype.handlePath = function (path) {
    let pathObject = this.client.swaggerObject.paths[path];
    for (let method of Object.keys(pathObject)) {
        if (!knownHttpMethods.includes(method)) continue;
        this.handleMethod(path, method);
    }
};

/**
 * Handle given route path:method in the spec
 * @param path
 * @param method
 */
STS.prototype.handleMethod = function (path, method) {
    let suite = new Mocha.Suite(method.toUpperCase() + ' ' + path);
    this.serverSuite.addSuite(suite);
    let operation = this.findOperation(path, method);
    let responses = this.hackSuccessResponse(operation);
    for (let responseCode of Object.keys(responses)) {
        this.handleResponse(suite, operation, responseCode);
    }
};

/**
 * Handle given route path:method:response in the spec
 * @param suite
 * @param operation
 * @param responseCode
 */
STS.prototype.handleResponse = function (suite, operation, responseCode) {
    // We wanted to use operation.responses,
    //  but since we added operation.successResponse to the list it does not contains x-amples
    // Alternatively we wanted to use this.client.swaggerObject, but it does not contains x-amples at all
    let examples = this.spec.paths[operation.path][operation.method].responses[responseCode]['x-amples'];
    if (!examples || examples.length <= 0) {
        examples = [{ description: 'should return expected HTTP status code' }];
    }
    for (let example of examples) {
        this.handleExample(suite, operation, responseCode, example);
    }
};

/**
 * Handle given example
 * @param suite
 * @param operation
 * @param responseCode
 * @param example
 */
STS.prototype.handleExample = function (suite, operation, responseCode, example) {
    let self = this;
    suite.addTest(new Mocha.Test(responseCode + ': ' + example.description, function () {
        return self.exampleValidator.handle(operation, responseCode, example);
    }));
};
