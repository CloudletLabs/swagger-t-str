'use strict';

let yaml = require('js-yaml');
let fs = require('fs');
let preq = require('preq');
let mocha = require('mocha');

let sinon = require('sinon');
let chai = require('chai');
let sinonChai = require('sinon-chai');
let expect = chai.expect;
chai.use(sinonChai);

module.exports = SWT;

function SWT(program) {
    this.spec = yaml.safeLoad(fs.readFileSync(program.spec, 'utf8'));
    this.uri = program.protocol + '://' + program.host + ':' + program.port + this.spec.basePath;
}

SWT.prototype.start = function () {
    let tests = this.getTests();
    for (let test of tests) {
        this.test(test);
    }
};

SWT.prototype.getTests = function () {
    let tests = [];
    let paths = this.spec.paths;
    for (let path of Object.keys(paths)) {
        let pathObject = paths[path];
        for (let method of Object.keys(pathObject)) {
            let methodObject = pathObject[method];
            for (let code of Object.keys(methodObject.responses)) {
                let examples = methodObject.responses[code]['x-amples'];
                if (!examples) examples = [];
                tests.push(this.getTest(path, method, parseInt(code), examples));
            }
        }
    }
    return tests;
};

SWT.prototype.getTest = function (path, method, code, examples) {
    if (examples.length <= 0) {
        examples.push({
            description: 'default'
        });
    }
    let uri = this.uri;
    return {
        path: path,
        method: method,
        examples: examples.map(function (ex) {
            if (!ex.request) ex.request = {};
            ex.request.method = method;
            ex.request.uri = uri + path;
            if (!ex.response) ex.response = {};
            ex.response.status = code;
            return ex;
        })
    };
};

SWT.prototype.test = function (test) {
    mocha.describe(test.path, function () {
        mocha.describe(test.method, function () {
            for (let example of test.examples) {
                mocha.it(example.response.status + ': ' + example.description, function () {
                    preq[example.request.method](example.request).then(function (resp) {
                        expect(resp).to.eq(example.response);
                    });
                });
            }
        });
    });
};