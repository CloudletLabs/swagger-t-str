'use strict';

let yaml = require('js-yaml');
let fs = require('fs');

let Mocha = require('mocha');
let mocha = new Mocha();

let STSExampleHandler = require('./STSExampleHandler');

module.exports = STS;

function STS(program) {
    this.spec = yaml.safeLoad(fs.readFileSync(program.spec, 'utf8'));
    this.uri = program.protocol + '://' + program.host + ':' + program.port + this.spec.basePath;
    this.exampleValidator = new STSExampleHandler(this.spec);
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
    let self = this;
    suit.addTest(new Mocha.Test(
        example.request.method.toUpperCase() + ' ' + example.response.status + ': ' + example.description,
        function () {
            return self.exampleValidator.handle(example);
        }));
};

STS.prototype.getExamples = function (path, method, code, examples) {
    let self = this;
    return examples.map(function (ex) {
        ex.specPath = path;
        ex.specMethod = method;
        ex.specCode = code;
        if (!ex.request) ex.request = {};
        if (!ex.request.headers) ex.request.headers = {};
        ex.request.method = method;
        ex.request.uri = self.uri + path;
        if (!ex.response) ex.response = {};
        ex.response.status = code;
        return JSON.parse(JSON.stringify(ex));
    });
};

STS.prototype.test = function (suit, path, method, code, examples) {
    let self = this;
    if (!examples || examples.length <= 0) {
        examples = [{ description: 'should return HTTP status code' }];
    }
    for (let example of self.getExamples(path, method, parseInt(code), examples)) {
        self.addTest(suit, example);
    }
};
