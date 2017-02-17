'use strict';

let sinon = require('sinon');
let chai = require('chai');
let expect = chai.expect;
let sinonChai = require('sinon-chai');
chai.use(sinonChai);
let proxyquire = require('proxyquire');

describe('The bin module', function() {
    //noinspection JSUnresolvedVariable
    let sandbox = sinon.sandbox.create();
    let pathStub,
        fsStub,
        commanderStub,
        STSMock,
        STSSpy;
    
    beforeEach(function () {
        pathStub = sandbox.stub();
        pathStub.join = sandbox.stub().returns(pathStub);
        fsStub = sandbox.stub();
        fsStub.readFileSync = sandbox.stub().returns('{"version": "1.2.3"}');
        commanderStub = sandbox.stub();
        commanderStub.version = sandbox.stub().returns(commanderStub);
        commanderStub.option = sandbox.stub().returns(commanderStub);
        commanderStub.parse = sandbox.stub().returns(commanderStub);
        commanderStub.url = sandbox.stub();
        commanderStub.spec = sandbox.stub();
        STSSpy = sandbox.spy();
        STSMock = function STS() {
            //noinspection JSCheckFunctionSignatures
            STSSpy.apply(this, arguments);
        };
        STSMock.prototype.start = sandbox.stub();
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should start lib', function () {
        let bin = proxyquire('../../bin/swagger-t-str', {
            'path': pathStub,
            'fs': fsStub,
            'commander': commanderStub,
            '../': STSMock
        });
        //noinspection JSUnresolvedVariable
        expect(pathStub.join).to.calledWithExactly(sinon.match.string, '..', 'package.json');
        expect(fsStub.readFileSync).to.calledWithExactly(pathStub, 'utf8');
        expect(commanderStub.version).to.calledWithExactly('1.2.3');
        expect(commanderStub.option).to.calledWithExactly(
            '-u, --url [URL]', 'API URL, default http://localhost:8081', 'http://localhost:8081');
        expect(commanderStub.option).to.calledWithExactly(
            '-s, --spec [path]', 'json/yaml swagger file path, default ./swagger.yml', './swagger.yml');
        expect(commanderStub.parse).to.calledWithExactly(process.argv);
        expect(STSSpy).to.calledWithExactly(commanderStub.url, commanderStub.spec);
        //noinspection JSUnresolvedVariable
        expect(STSMock.prototype.start).to.calledWithExactly(sinon.match.func);

        let exitStub = sandbox.stub(process, 'exit');
        STSMock.prototype.start.args[0][0](-1);
        expect(exitStub).to.calledWithExactly(-1);
    });
});