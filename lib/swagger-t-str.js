'use strict';

let yaml = require('js-yaml');
let fs = require('fs');
let preq = require('preq');

let Mocha = require('mocha');
let mocha = new Mocha();
let chai = require('chai');
let chaiSubset = require('chai-subset');
chai.use(chaiSubset);

let swaggerTools = require('swagger-tools');

module.exports = STS;

function STS(program) {
    this.spec = yaml.safeLoad(fs.readFileSync(program.spec, 'utf8'));
    this.uri = program.protocol + '://' + program.host + ':' + program.port + this.spec.basePath;
}

STS.prototype.start = function (callback) {
    let serverSuit = this.addSuit(this.uri);
    let paths = this.spec.paths;
    for (let path of Object.keys(paths)) {
        let pathSuit = this.addSuit(path, serverSuit);
        let pathObject = paths[path];
        for (let method of Object.keys(pathObject)) {
            let methodSuit = this.addSuit(method.toUpperCase(), pathSuit);
            let methodObject = pathObject[method];
            for (let code of Object.keys(methodObject.responses)) {
                let codeSuit = this.addSuit(code, methodSuit);
                let examples = methodObject.responses[code]['x-amples'];
                this.test(codeSuit, path, method, code, examples);
            }
        }
    }
    mocha.run(callback);
};

STS.prototype.addSuit = function (name, parent) {
    if (parent) {
        let suit = new Mocha.Suite(name);
        parent.addSuite(suit);
        return suit;
    } else {
        return Mocha.Suite.create(mocha.suite, name);
    }
};

STS.prototype.addTest = function (suit, example) {
    let sts = this;
    suit.addTest(new Mocha.Test(
        example.request.method.toUpperCase() + ' ' + example.response.status + ': ' + example.description,
        function () {
            return sts.doTest(example);
        }));
};

STS.prototype.test = function (suit, path, method, code, examples) {
    let sts = this;
    if (!examples || examples.length <= 0) {
        examples = [{ description: 'should return HTTP status code' }];
    }
    for (let example of sts.getExamples(path, method, parseInt(code), examples)) {
        sts.addTest(suit, example);
    }
};

STS.prototype.getExamples = function (path, method, code, examples) {
    let sts = this;
    return examples.map(function (ex) {
        ex = Object.assign({}, ex);
        ex.specMethodParameters = sts.spec.paths[path][method].parameters;
        ex.specMethodSecurity = sts.spec.paths[path][method].security;
        ex.specResponseSchema = sts.spec.paths[path][method].responses[code].schema;
        if (!ex.request) ex.request = {};
        if (!ex.request.headers) ex.request.headers = {};
        ex.request.method = method;
        ex.request.uri = sts.uri + path;
        if (!ex.response) ex.response = {};
        ex.response.status = code;
        return ex;
    });
};

STS.prototype.doTest = function (example) {
    this.substituteUrlParameters(example);
    this.addAuth(example);
    let validator = this.getValidator(example);
    return preq[example.request.method](example.request).then(validator, validator);
};

STS.prototype.substituteUrlParameters = function (example) {
    let request = example.request;
    if (!example.specMethodParameters || !request.parameters) return;
    for (let param of example.specMethodParameters) {
        if (param.in == 'path' && request.parameters[param.name]) {
            request.uri = request.uri.replace('{' + param.name + '}', request.parameters[param.name]);
            delete request.parameters[param.name];
        }
    }
};

STS.prototype.addAuth = function (example) {
    if (!example.auth || !this.spec.securityDefinitions) return;
    let securities = example.specMethodSecurity.map(function (security) {
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

STS.prototype.getValidator = function (example) {
    let sts = this;
    return function (resp) {
        return sts.doValidate(example, resp);
    }
};

STS.prototype.doValidate = function (example, response) {
    chai.expect(response).to.containSubset(example.response);
    if (example.authProviderFor) {
        this.dispatchAuth(example.authProviderFor, response);
    }
    let schema = example.specResponseSchema;
    if (schema && schema['$ref'] && response.body) {
        return this.doValidateSwaggerSchema(schema['$ref'], response.body);
    }
};

STS.prototype.dispatchAuth = function (exampleStrategies, response) {
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

STS.prototype.doValidateSwaggerSchema = function (ref, body) {
    let sts = this;
    return new Promise(function (resolve, reject) {
        swaggerTools.specs.v2.validateModel(sts.spec, ref, body, function (err, result) {
            if (err) return reject(err);
            if (result) {
                let messages = result.errors.map(function (err) {
                    return '#/' + err.path.join('/') + ': ' + err.message;
                });
                return reject(new Error('Validation failed:\n' + messages.join('\n')));
            }
            resolve();
        });
    });
};