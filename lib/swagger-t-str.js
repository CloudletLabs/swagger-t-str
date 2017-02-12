'use strict';

let yaml = require('js-yaml');
let fs = require('fs');
let preq = require('preq');

let Mocha = require('mocha');
let mocha = new Mocha();
let sinon = require('sinon');
let chai = require('chai');
let sinonChai = require('sinon-chai');
chai.use(sinonChai);
let expect = chai.expect;

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
                this.test(codeSuit, path, methodObject.parameters, method, code, examples);
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

SWT.prototype.getExamples = function (path, parameters, method, code, examples) {
    if (!examples || examples.length <= 0) {
        examples = [{ description: 'default' }];
    }
    let sts = this;
    return examples.map(function (ex) {
        if (!ex.request) ex.request = {};
        ex.request.method = method;
        ex.request.uri = sts.uri + path;
        sts.addUrlParameters(parameters, ex.request);
        if (!ex.response) ex.response = {};
        ex.response.status = code;
        return ex;
    });
};

SWT.prototype.addUrlParameters = function (parameters, request) {
    if (!parameters || !request.parameters) return;
    for (let param of parameters) {
        if (param.in == 'path' && request.parameters[param.name]) {
            request.uri = request.uri.replace('{' + param.name + '}', request.parameters[param.name]);
        }
    }
};

SWT.prototype.test = function (suit, path, parameters, method, code, examples) {
    let sts = this;
    for (let example of sts.getExamples(path, parameters, method, parseInt(code), examples)) {
        let test = new Mocha.Test(example.request.method.toUpperCase() + ' ' + example.response.status + ': ' + example.description,
            function () {
                return sts.doTest(example);
            });
        suit.addTest(test);
    }
};

SWT.prototype.doTest = function (example) {
    let sts = this;
    return preq[example.request.method](example.request).then(function (resp) {
        sts.validate(example, resp);
    }, function (err) {
        if (!example.response.name) delete err.name;
        if (!example.response.message) delete err.message;
        sts.validate(example, err);
    });
};

SWT.prototype.validate = function (example, resp) {
    if (!example.response.headers) delete resp.headers;
    if (!example.response.body) delete resp.body;
    expect(resp).to.eql(example.response);
};