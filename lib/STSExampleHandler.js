'use strict';

let chai = require('chai');
let chaiSubset = require('chai-subset');
chai.use(chaiSubset);

let STSAuthHelper = require('./STSAuthHelper');
let STSSchemaValidator = require('./STSSchemaValidator');

module.exports = STSExampleHandler;

/**
 * Create new handler instance
 * @param spec
 * @param client
 * @constructor
 */
function STSExampleHandler(spec, client) {
    this.client = client;
    this.clientAuthorizations = STSAuthHelper.parse(client);
    this.schemaValidator = new STSSchemaValidator(spec);
}

/**
 * Handle given example
 * @param operation
 * @param responseCode
 * @param example
 * @returns {Promise}
 */
STSExampleHandler.prototype.handle = function (operation, responseCode, example) {
    example = this.normalizeExample(responseCode, example);
    let validator = this.getValidator(operation, responseCode, example);
    let request = this.buildRequest(operation, example);
    let clientAuthorizations = this.getAuthorizations(example);
    return this.client.default[operation.nickname](request, {
        clientAuthorizations: clientAuthorizations
    }).then(validator, validator);
};

/**
 * Normalize example by creating default empty fields and adding responseCode and response.status
 * @param responseCode
 * @param example
 * @returns {*}
 */
STSExampleHandler.prototype.normalizeExample = function (responseCode, example) {
    example = JSON.parse(JSON.stringify(example));
    if (!example.request) example.request = {};
    if (!example.request.parameters) example.request.parameters = {};
    if (!example.request.headers) example.request.headers = {};
    if (!example.request.body) example.request.body = {};
    if (!example.response) example.response = {};
    if (!example.response.status) example.response.status = parseInt(responseCode);
    return example;
};

/**
 * Get validator function for given example
 * @param operation
 * @param responseCode
 * @param example
 * @returns {Function}
 */
STSExampleHandler.prototype.getValidator = function (operation, responseCode, example) {
    let self = this;
    return function (resp) {
        return self.doValidate(operation, responseCode, example, resp);
    }
};

/**
 * Build request for given example
 * @param operation
 * @param example
 */
STSExampleHandler.prototype.buildRequest = function (operation, example) {
    let request = this.buildDefaultRequest(operation);
    request = Object.assign(request, example.request.headers);
    request = Object.assign(request, example.request.parameters);
    request = Object.assign(request, { body: example.request.body });
    return request;
};

/**
 * Build default request for given operation
 * @param operation
 * @returns {{}}
 */
STSExampleHandler.prototype.buildDefaultRequest = function (operation) {
    let request = {};
    if (this.client.swaggerObject.parameters) {
        for (let paramName of Object.keys(this.client.swaggerObject.parameters)) {
            let parameter = this.client.swaggerObject.parameters[paramName];
            if (parameter && parameter['x-ample']) {
                request[paramName] = parameter['x-ample'];
            }
        }
    }
    if (operation.parameters) {
        for (let parameter of operation.parameters) {
            if (parameter['x-ample']) {
                request[parameter.name] = parameter['x-ample'];
            }
        }
    }
    return request;
};

/**
 * Return clientAuthorizations for the given example
 * @param example
 * @returns {{clientAuthorizations: *}|null}
 */
STSExampleHandler.prototype.getAuthorizations = function (example) {
    if (!example.auth) return null;
    if (!(example.auth instanceof Object)) return this.clientAuthorizations;
    let clientAuthorizations = Object.assign({}, this.clientAuthorizations);
    for (let auth of Object.keys(example.auth)) {
        STSAuthHelper.add(this.client, clientAuthorizations, auth,
            example.auth[auth]);
    }
    return clientAuthorizations;
};

/**
 * Validate response received
 * @param operation
 * @param responseCode
 * @param example
 * @param response
 */
STSExampleHandler.prototype.doValidate = function (operation, responseCode, example, response) {
    //noinspection JSUnresolvedVariable
    chai.expect(response).to.containSubset(example.response);
    this.dispatchAuth(example, response);
    this.dispatchParams(operation, example, response);
    return this.schemaValidator.validate(operation, responseCode, response);
};

/**
 * Dispatch auth if given example is an auth provider
 * @param example
 * @param response
 */
STSExampleHandler.prototype.dispatchAuth = function (example, response) {
    let authProviderFor = example.authProviderFor;
    if (!authProviderFor) return;
    for (let strategyName of Object.keys(authProviderFor)) {
        if (this.client.securityDefinitions[strategyName] && authProviderFor[strategyName]['x-ample']) {
            STSAuthHelper.add(this.client, this.clientAuthorizations, strategyName,
                this.eval(response, authProviderFor[strategyName]['x-ample']));
        }
    }
};

STSExampleHandler.prototype.dispatchParams = function (operation, example, response) {
    let paramProviderFor = example.paramProviderFor;
    if (!paramProviderFor) return;
    for (let paramName of Object.keys(paramProviderFor)) {
        let parameter = operation.parameters.find(function (param) {
            if (param.name == paramName) return true;
        });
        let example = this.eval(response, paramProviderFor[paramName]['x-ample']);
        if (parameter) {
            parameter['x-ample'] = example;
        }
        if (this.client.swaggerObject.parameters[paramName]) {
            this.client.swaggerObject.parameters[paramName]['x-ample'] = example;
        }
    }
};

STSExampleHandler.prototype.eval = function (response, string) {
    //noinspection JSUnusedLocalSymbols
    let headers = response.headers;
    //noinspection JSUnusedLocalSymbols
    let obj = response.obj;
    return eval('`' + string + '`')
};