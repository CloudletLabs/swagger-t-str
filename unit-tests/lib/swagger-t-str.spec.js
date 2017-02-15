'use strict';

let chai = require('chai');
let expect = chai.expect;
let sinon = require('sinon');
let sinonChai = require('sinon-chai');
chai.use(sinonChai);
let proxyquire = require('proxyquire');

describe('STS module', function() {
    let sandbox = sinon.sandbox.create();
    let yamlStub,
        fsStub,
        mochaStub,
        exampleHandlerMock,
        programStub,
        specStub,
        STS,
        sts;

    beforeEach(function () {
        yamlStub = sandbox.stub();

        fsStub = sandbox.stub();
        fsStub.readFileSync = sandbox.stub().returns(fsStub);

        mochaStub = function Mocha() { };

        exampleHandlerMock = function (spec) {
            this.spec = spec;
        };

        programStub = sandbox.stub();
        programStub.spec = sandbox.stub();
        programStub.protocol = 'test_protocol';
        programStub.host = 'test_host';
        programStub.port = 'test_port';

        specStub = sandbox.stub();
        specStub.basePath = '/test_base_path';
        yamlStub.safeLoad = sandbox.stub().returns(specStub);

        STS = proxyquire('../../lib/swagger-t-str', {
            'js-yaml': yamlStub,
            'fs': fsStub,
            'mocha': mochaStub
        });
        sts = new STS(programStub);
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should construct STS', function () {
        expect(sts.spec).to.equals(specStub);
        expect(sts.uri).to.equals('test_protocol://test_host:test_port/test_base_path');
        expect(sts.exampleValidator.spec).to.equals(specStub);
        expect(fsStub.readFileSync).to.have.been.calledWithExactly(programStub.spec, 'utf8');
        expect(yamlStub.safeLoad).to.have.been.calledWithExactly(fsStub);
    });

    it('should start', function () {
        mochaStub.prototype.run = sandbox.stub();
        sts.spec = {
            paths: {
                '/test1': {
                    get: {
                        responses: {
                            200: {
                                'x-amples': ['ex1', 'ex2']
                            }
                        }
                    },
                    post: {
                        responses: {
                            300: {
                                'x-amples': ['ex3']
                            },
                            400: {}
                        }
                    }
                },
                '/test2': {
                    put: {
                        parameters: {},
                        responses: {
                            500: {
                                'x-amples': []
                            }
                        }
                    }
                }
            }
        };
        let addSuitStub = sandbox.stub(sts, 'addSuit');
        addSuitStub.returns(addSuitStub);
        let testStub = sandbox.stub(sts, 'test');
        let callbackStub = sandbox.stub();

        sts.start(callbackStub);

        expect(addSuitStub).to.have.been.callCount(10);
        expect(addSuitStub).to.have.been.calledWithExactly('test_protocol://test_host:test_port/test_base_path');
        expect(addSuitStub).to.have.been.calledWithExactly('/test1', addSuitStub);
        expect(addSuitStub).to.have.been.calledWithExactly('GET', addSuitStub);
        expect(addSuitStub).to.have.been.calledWithExactly('200', addSuitStub);
        expect(testStub).to.have.been.calledWithExactly(addSuitStub, '/test1', 'get', '200', ['ex1', 'ex2']);
        expect(addSuitStub).to.have.been.calledWithExactly('POST', addSuitStub);
        expect(addSuitStub).to.have.been.calledWithExactly('300', addSuitStub);
        expect(testStub).to.have.been.calledWithExactly(addSuitStub, '/test1', 'post', '300', ['ex3']);
        expect(addSuitStub).to.have.been.calledWithExactly('400', addSuitStub);
        expect(testStub).to.have.been.calledWithExactly(addSuitStub, '/test1', 'post', '400', undefined);
        expect(addSuitStub).to.have.been.calledWithExactly('/test2', addSuitStub);
        expect(addSuitStub).to.have.been.calledWithExactly('PUT', addSuitStub);
        expect(addSuitStub).to.have.been.calledWithExactly('500', addSuitStub);
        expect(testStub).to.have.been.calledWithExactly(addSuitStub, '/test2', 'put', '500', []);
        expect(mochaStub.prototype.run).to.have.been.calledWithExactly(callbackStub);
    });

    describe('adding suits and tests', function () {
        let nameStub;

        beforeEach(function () {
            mochaStub.prototype.suite = sandbox.stub();
            mochaStub.Suite = function Suite(name) {
                this.name = name;
            };
            mochaStub.Suite.create = sandbox.stub().returns(mochaStub);
            mochaStub.Suite.prototype.addSuite = sandbox.stub().returns(mochaStub);
            mochaStub.Suite.prototype.addTest = function (suit) {
                if (!this.suits) this.suits = [];
                this.suits.push(suit);
            };
            mochaStub.Test = function Test(name, test) {
                this.name = name;
                this.test = test;
            };

            nameStub = sandbox.stub();
        });

        it('should create root suite', function () {
            expect(sts.addSuit(nameStub)).to.equals(mochaStub);

            expect(mochaStub.Suite.create).to.have.been.calledWithExactly(mochaStub.prototype.suite, nameStub);
        });

        it('should create child suite', function () {
            let parentMock = new mochaStub.Suite(null);

            let suit = sts.addSuit(nameStub, parentMock);

            expect(suit.name).to.equals(nameStub);
            expect(mochaStub.Suite.prototype.addSuite).to.have.been.calledWithExactly(suit);
        });

        it('should add test', function () {
            let suitMock = new mochaStub.Suite(null);
            let exampleMock = {
                description: '[test desc]',
                request: {
                    method: '[test method]'
                },
                response: {
                    status: '[test status]'
                }
            };
            sts.addTest(suitMock, exampleMock);

            expect(suitMock.suits.length).to.equals(1);
            expect(suitMock.suits[0]['name']).to.eql('[TEST METHOD] [test status]: [test desc]');
            expect(suitMock.suits[0]['test']).to.be.a('function');

            let exampleValidatorHandleStub = sandbox.stub(sts.exampleValidator, 'handle');

            suitMock.suits[0]['test']();
            expect(exampleValidatorHandleStub).to.have.been.calledWithExactly(exampleMock);
        });
    });

    it('should get samples', function () {
        let pathMock = '/test_path';
        let methodMock = 'methodMock';
        let codeMock = 'codeMock';
        let examplesMock = [
            { description: 'test1' },
            {
                description: 'test2',
                field1: 'value1',
                request: {
                    field2: 'value2',
                    headers: {}
                },
                response: {
                    field3: 'value3'
                }
            }
        ];

        let test = sts.getExamples(pathMock, methodMock, codeMock, examplesMock);

        expect(test).to.eqls([
            {
                description: 'test1',
                specPath: pathMock,
                specMethod: methodMock,
                specCode: codeMock,
                request: {
                    method: methodMock,
                    uri: 'test_protocol://test_host:test_port/test_base_path/test_path',
                    headers: {}
                },
                response: {
                    status: codeMock
                }
            },
            {
                description: 'test2',
                specPath: pathMock,
                specMethod: methodMock,
                specCode: codeMock,
                field1: 'value1',
                request: {
                    method: methodMock,
                    uri: 'test_protocol://test_host:test_port/test_base_path/test_path',
                    field2: 'value2',
                    headers: {}
                },
                response: {
                    status: codeMock,
                    field3: 'value3'
                }
            }
        ]);
    });

    describe('creating tests for examples', function () {
        let suitMock,
            pathStub,
            methodStub,
            codeMock,
            getExamplesStub,
            addTestStub;

        beforeEach(function () {
            suitMock = sandbox.stub();
            pathStub = sandbox.stub();
            methodStub = sandbox.stub();
            codeMock = '323';
            getExamplesStub = sandbox.stub(sts, 'getExamples').returnsArg(3);
            addTestStub = sandbox.stub(sts, 'addTest');
        });

        it('should create for given examples', function () {
            let examplesMock = ['example 1', 'example 2'];

            sts.test(suitMock, pathStub, methodStub, codeMock, examplesMock);

            expect(getExamplesStub).to.have.been.calledWithExactly(pathStub, methodStub, 323, examplesMock);
            expect(addTestStub).to.have.been.calledWithExactly(suitMock, 'example 1');
            expect(addTestStub).to.have.been.calledWithExactly(suitMock, 'example 2');
        });

        describe('empty examples', function () {
            let commonTests = function () {
                let expectedExamples = [{ description: 'should return HTTP status code' }];
                expect(getExamplesStub).to.have.been.calledWithExactly(pathStub, methodStub, 323, expectedExamples);
                expect(addTestStub).to.have.been.calledWithExactly(suitMock, expectedExamples[0]);
            };

            it('should create for empty examples list', function () {
                sts.test(suitMock, pathStub, methodStub, codeMock, []);
                commonTests();
            });

            it('should create for null examples list', function () {
                sts.test(suitMock, pathStub, methodStub, codeMock, null);
                commonTests();
            });
        });
    });
});