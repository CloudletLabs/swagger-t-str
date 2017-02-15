'use strict';

let preq = require('preq');

let chai = require('chai');
let chaiSubset = require('chai-subset');
chai.use(chaiSubset);

let STSSchemaValidator = require('./STSSchemaValidator');

module.exports = STSExampleHandler;

function STSExampleHandler(spec) {
    this.spec = spec;
    this.schemaValidator = new STSSchemaValidator(spec);
}

STSExampleHandler.prototype.handle = function (example) {
    this.substituteUrlParameters(example);
    this.addAuth(example);
    let validator = this.getValidator(example);
    return preq[example.request.method](example.request).then(validator, validator);
};

STSExampleHandler.prototype.substituteUrlParameters = function (example) {
    let specMethodParameters = this.spec.paths[example.specPath][example.specMethod].parameters;
    let request = example.request;
    if (!specMethodParameters || !request.parameters) return;
    for (let param of specMethodParameters) {
        if (param.in == 'path' && request.parameters[param.name]) {
            request.uri = request.uri.replace('{' + param.name + '}', request.parameters[param.name]);
            delete request.parameters[param.name];
        }
    }
};

STSExampleHandler.prototype.addAuth = function (example) {
    let specMethodSecurity = this.spec.paths[example.specPath][example.specMethod].security;
    if (!example.auth || !this.spec.securityDefinitions) return;
    let securities = specMethodSecurity.map(function (security) {
        return Object.keys(security);
    });
    securities = [].concat.apply([], securities);
    for (let security of securities) {
        let auth = this.spec.securityDefinitions[security];
        if (!auth['x-ample']) continue;
        if (auth.type != 'basic' && auth.in != 'header') continue; // other types not supported just yet
        let headerName = auth.name || 'Authorization';
        example.request.headers[headerName] = auth['x-ample'];
    }
};

STSExampleHandler.prototype.getValidator = function (example) {
    let self = this;
    return function (resp) {
        return self.doValidate(example, resp);
    }
};

STSExampleHandler.prototype.doValidate = function (example, response) {
    chai.expect(response).to.containSubset(example.response);
    if (example.authProviderFor) {
        this.dispatchAuth(example.authProviderFor, response);
    }
    let specResponseSchema = this.spec.paths[example.specPath][example.specMethod].responses[example.specCode].schema;
    if (specResponseSchema && specResponseSchema['$ref'] && response.body) {
        return this.schemaValidator.validate(specResponseSchema['$ref'], response.body);
    }
};

STSExampleHandler.prototype.dispatchAuth = function (exampleStrategies, response) {
    //noinspection JSUnusedLocalSymbols
    let headers = response.headers;
    //noinspection JSUnusedLocalSymbols
    let body = response.body;
    for (let strategyName of Object.keys(exampleStrategies)) {
        if (this.spec.securityDefinitions[strategyName] && exampleStrategies[strategyName]['x-ample']) {
            this.spec.securityDefinitions[strategyName]['x-ample'] =
                eval('`' + exampleStrategies[strategyName]['x-ample'] + '`');
        }
    }
};
