'use strict';

let yaml = require('js-yaml');
let fs = require('fs');
let preq = require('preq');

let Mocha = require('mocha');
let mocha = new Mocha();
let sinon = require('sinon');
let chai = require('chai');
var chaiSubset = require('chai-subset');
chai.use(chaiSubset);
let sinonChai = require('sinon-chai');
chai.use(sinonChai);
let expect = chai.expect;

let swaggerTools = require('swagger-tools').specs.v2;

module.exports = SWT;

function SWT(program) {
    this.spec = yaml.safeLoad(fs.readFileSync(program.spec, 'utf8'));
    this.uri = program.protocol + '://' + program.host + ':' + program.port + this.spec.basePath;
}

SWT.prototype.start = function (callback) {
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

SWT.prototype.addSuit = function (name, parent) {
    if (parent) {
        let suit = new Mocha.Suite(name);
        parent.addSuite(suit);
        return suit;
    } else {
        return Mocha.Suite.create(mocha.suite, name);
    }
};

SWT.prototype.getExamples = function (path, method, code, examples) {
    if (!examples || examples.length <= 0) {
        examples = [{ description: 'should return HTTP status code' }];
    }
    let sts = this;
    return examples.map(function (ex) {
        ex = Object.assign({}, ex);
        if (!ex.request) ex.request = {};
        if (!ex.request.headers) ex.request.headers = {};
        ex.request.method = method;
        ex.request.uri = sts.uri + path;
        sts.addUrlParameters(path, method, ex);
        sts.addAuth(path, method, code, ex);
        if (!ex.response) ex.response = {};
        ex.response.status = code;
        return ex;
    });
};

SWT.prototype.addUrlParameters = function (path, method, example) {
    let parameters = this.spec.paths[path][method].parameters;
    let request = example.request;
    if (!parameters || !request.parameters) return;
    for (let param of parameters) {
        if (param.in == 'path' && request.parameters[param.name]) {
            request.uri = request.uri.replace('{' + param.name + '}', request.parameters[param.name]);
        }
    }
};

SWT.prototype.addAuth = function (path, method, code, example) {
    if (!example.auth || !this.spec.securityDefinitions) return;
    let securities = this.spec.paths[path][method].security.map(function (security) {
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

SWT.prototype.test = function (suit, path, method, code, examples) {
    let sts = this;
    for (let example of sts.getExamples(path, method, parseInt(code), examples)) {
        let test = new Mocha.Test(example.request.method.toUpperCase() + ' ' + example.response.status + ': ' + example.description,
            function (done) {
                return sts.doTest(sts.spec.paths[path][method].responses[code].schema, example, done);
            });
        suit.addTest(test);
    }
};

SWT.prototype.doTest = function (schema, example, done) {
    let sts = this;
    preq[example.request.method](example.request).then(function (resp) {
        sts.validate(schema, example, resp, done);
    }, function (err) {
        sts.validate(schema, example, err, done);
    });
};

SWT.prototype.validate = function (schema, example, response, done) {
    expect(response).to.containSubset(example.response);
    if (!schema || !schema['$ref'] || !response.body) return done();
    swaggerTools.validateModel(this.spec, schema['$ref'], response.body, function (err, result) {
        if (err) return done(err);
        if (result) {
            let messages = [];
            for (let err of result.errors) {
                messages.push('#/' + err.path.join('/') + ': ' + err.message);
            }
            done(new Error('Validation failed:\n' + messages.join('\n')));
        } else {
            done();
        }
    });
};