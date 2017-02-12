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
    let sts = this;
    let paths = this.spec.paths;
    for (let path of Object.keys(paths)) {
        let pathSuit = sts.addSuit(path);
        let pathObject = paths[path];
        for (let method of Object.keys(pathObject)) {
            let methodSuit = sts.addSuit(method, pathSuit);
            let methodObject = pathObject[method];
            for (let code of Object.keys(methodObject.responses)) {
                let codeSuit = sts.addSuit(code, methodSuit);
                let examples = methodObject.responses[code]['x-amples'];
                if (!examples) examples = [];
                sts.test(codeSuit, sts.getExamples(path, method, parseInt(code), examples));
            }
        }
    }
    mocha.run(callback);
};

SWT.prototype.addSuit = function (name, parent) {
    if (parent) {
        return parent.addSuite(Mocha.Suite.create(mocha.suite, name));
    } else {
        return Mocha.Suite.create(mocha.suite, name);
    }
};

SWT.prototype.getExamples = function (path, method, code, examples) {
    if (examples.length <= 0) {
        examples.push({
            description: 'default'
        });
    }
    let uri = this.uri;
    return examples.map(function (ex) {
        if (!ex.request) ex.request = {};
        ex.request.method = method;
        ex.request.uri = uri + path;
        if (!ex.response) ex.response = {};
        ex.response.status = code;
        return ex;
    });
};

SWT.prototype.test = function (suit, examples) {
    for (let example of examples) {
        let test = new Mocha.Test(example.request.method.toUpperCase() + ' ' + example.response.status + ': ' + example.description,
            function () {
                return preq[example.request.method](example.request).then(function (resp) {
                    expect(resp).to.eql(example.response);
                });
            });
        suit.addTest(test);
    }
};