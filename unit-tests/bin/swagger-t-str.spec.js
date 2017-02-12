'use strict';

let sinon = require('sinon');
let chai = require('chai');
let sinonChai = require('sinon-chai');
let expect = chai.expect;
chai.use(sinonChai);
let proxyquire = require('proxyquire');

describe('The bin module', function() {
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
        STSSpy = sandbox.spy();
        STSMock = function STS(program) {
            STSSpy(program);
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
        expect(pathStub.join).to.have.been.calledWithExactly(sinon.match.string, '..', 'package.json');
        expect(fsStub.readFileSync).to.have.been.calledWithExactly(pathStub, 'utf8');
        expect(commanderStub.version).to.have.been.calledWithExactly('1.2.3');
        expect(commanderStub.option).to.have.been.calledWithExactly(
            '-p, --protocol [protocol]', 'protocol [http, https], default http', 'http');
        expect(commanderStub.option).to.have.been.calledWithExactly(
            '-h, --host [host]', 'API host, default localhost', 'localhost');
        expect(commanderStub.option).to.have.been.calledWithExactly(
            '-P, --port [port]', 'API port, default 8081', '8081');
        expect(commanderStub.option).to.have.been.calledWithExactly(
            '-s, --spec [path]', 'json/yaml swagger file path, default ./swagger.yml', './swagger.yml');
        expect(commanderStub.parse).to.have.been.calledWithExactly(process.argv);
        expect(STSSpy).to.have.been.calledWithExactly(commanderStub);
        expect(STSMock.prototype.start).to.have.been.calledWithExactly(sinon.match.func);

        let exitStub = sandbox.stub(process, 'exit');
        STSMock.prototype.start.args[0][0](1);
        expect(exitStub).to.have.been.calledWithExactly(1);
    });
});