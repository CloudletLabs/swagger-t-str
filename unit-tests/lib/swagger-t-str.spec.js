'use strict';

let sinon = require('sinon');
let chai = require('chai');
let sinonChai = require('sinon-chai');
let expect = chai.expect;
chai.use(sinonChai);
let proxyquire = require('proxyquire');

describe('The lib module', function() {
    let sandbox = sinon.sandbox.create();
    let yamlStub,
        fsStub,
        preqStub,
        mochaStub,
        sinonStub,
        chaiStub,
        sinonChaiStub,
        programStub,
        specStub,
        STS,
        sts;

    beforeEach(function () {
        yamlStub = sandbox.stub();

        fsStub = sandbox.stub();
        fsStub.readFileSync = sandbox.stub().returns(fsStub);

        preqStub = sandbox.stub();
        preqStub.get = sandbox.stub().returns(preqStub);
        preqStub.post = sandbox.stub().returns(preqStub);
        preqStub.then = sandbox.stub().returns(preqStub);

        mochaStub = function Mocha() { };
        mochaStub.prototype.suite = sandbox.stub();
        mochaStub.prototype.run = sandbox.stub();
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

        sinonStub = sandbox.stub();
        chaiStub = sandbox.stub();
        chaiStub.use = sandbox.stub();
        sinonChaiStub = sandbox.stub();
        chaiStub.expect = sandbox.stub().returns(chaiStub);
        chaiStub.to = chaiStub;
        chaiStub.eql = sandbox.stub().returns(chaiStub);

        programStub = sandbox.stub();
        programStub.protocol = 'test_protocol';
        programStub.host = 'test_host';
        programStub.port = 'test_port';
        programStub.spec = sandbox.stub();

        specStub = sandbox.stub();
        specStub.basePath = '/test_base_path';
        yamlStub.safeLoad = sandbox.stub().returns(specStub);

        STS = proxyquire('../../lib/swagger-t-str', {
            'js-yaml': yamlStub,
            'fs': fsStub,
            'preq': preqStub,
            'mocha': mochaStub,
            'sinon': sinonStub,
            'chai': chaiStub,
            'sinon-chai': sinonChaiStub
        });
        sts = new STS(programStub);
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should construct STS', function () {
        expect(chaiStub.use).to.have.been.calledWithExactly(sinonChaiStub);

        let sts = new STS(programStub);
        expect(sts.spec).to.equals(specStub);
        expect(sts.uri).to.equals('test_protocol://test_host:test_port/test_base_path');
        expect(fsStub.readFileSync).to.have.been.calledWithExactly(programStub.spec, 'utf8');
        expect(yamlStub.safeLoad).to.have.been.calledWithExactly(fsStub);
    });

    describe('STS', function () {
        it('should start', function () {
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
            expect(testStub).to.have.been.calledWithExactly(addSuitStub, '/test1', undefined, 'get', '200', ['ex1', 'ex2']);
            expect(addSuitStub).to.have.been.calledWithExactly('POST', addSuitStub);
            expect(addSuitStub).to.have.been.calledWithExactly('300', addSuitStub);
            expect(testStub).to.have.been.calledWithExactly(addSuitStub, '/test1', undefined, 'post', '300', ['ex3']);
            expect(addSuitStub).to.have.been.calledWithExactly('400', addSuitStub);
            expect(testStub).to.have.been.calledWithExactly(addSuitStub, '/test1', undefined, 'post', '400', undefined);
            expect(addSuitStub).to.have.been.calledWithExactly('/test2', addSuitStub);
            expect(addSuitStub).to.have.been.calledWithExactly('PUT', addSuitStub);
            expect(addSuitStub).to.have.been.calledWithExactly('500', addSuitStub);
            expect(testStub).to.have.been.calledWithExactly(addSuitStub, '/test2', {}, 'put', '500', []);
            expect(mochaStub.prototype.run).to.have.been.calledWithExactly(callbackStub);
        });

        describe('adding suits', function () {
            let nameStub;

            beforeEach(function () {
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
        });

        describe('get examples', function () {
            let pathMock,
                methodStub,
                codeStub,
                parametersStub,
                addUrlParametersStub;

            beforeEach(function () {
                pathMock = '/test_path';
                methodStub = sandbox.stub();
                codeStub = sandbox.stub();
                parametersStub = sandbox.stub();
                addUrlParametersStub = sandbox.stub(sts, 'addUrlParameters');
            });

            it('should get for empty', function () {
                let examplesMock = [];
                let expected = [
                    {
                        description: 'default',
                        request: {
                            method: methodStub,
                            uri: 'test_protocol://test_host:test_port/test_base_path/test_path'
                        },
                        response: {
                            status: codeStub
                        }
                    }
                ];

                let test1 = sts.getExamples(pathMock, parametersStub, methodStub, codeStub, examplesMock);
                expect(test1).to.eqls(expected);
                expect(addUrlParametersStub).to.have.been.calledWithExactly(parametersStub, test1[0].request);

                let test2 = sts.getExamples(pathMock, parametersStub, methodStub, codeStub, undefined);
                expect(test2).to.eqls(expected);
                expect(addUrlParametersStub).to.have.been.calledWithExactly(parametersStub, test2[0].request);
            });

            it('should get samples', function () {
                let examplesMock = [
                    { description: 'test1' },
                    {
                        description: 'test2',
                        field1: 'value1',
                        request: {
                            field2: 'value2'
                        },
                        response: {
                            field3: 'value3'
                        }
                    }
                ];

                let test = sts.getExamples(pathMock, parametersStub, methodStub, codeStub, examplesMock);
                expect(test).to.eqls([
                    {
                        description: 'test1',
                        request: {
                            method: methodStub,
                            uri: 'test_protocol://test_host:test_port/test_base_path/test_path'
                        },
                        response: {
                            status: codeStub
                        }
                    },
                    {
                        description: 'test2',
                        field1: 'value1',
                        request: {
                            method: methodStub,
                            uri: 'test_protocol://test_host:test_port/test_base_path/test_path',
                            field2: 'value2'
                        },
                        response: {
                            status: codeStub,
                            field3: 'value3'
                        }
                    }
                ]);
                expect(addUrlParametersStub).to.have.been.calledWithExactly(parametersStub, test[0].request);
                expect(addUrlParametersStub).to.have.been.calledWithExactly(parametersStub, test[1].request);
            });
        });

        describe('substitute parameters in url', function () {
            it ('should do nothing', function () {
                sts.addUrlParameters(null, {parameters: {}});
                sts.addUrlParameters([], {});
                sts.addUrlParameters([{in: 'fake'}], {parameters: {}});
                sts.addUrlParameters([{in: 'path', name: 'fake'}], {parameters: {}});
            });

            it ('should substitute', function () {
                let parametersMock = [
                    {
                        in: 'path',
                        name: 'param1'
                    },
                    {
                        in: 'path',
                        name: 'param2'
                    }
                ];
                let request = {
                    uri: 'http://localhost/foo/{param1}/{param2}',
                    parameters: {
                        param1: 'bar',
                        param2: 'baz'
                    }
                };

                sts.addUrlParameters(parametersMock, request);

                expect(request.uri).to.eql('http://localhost/foo/bar/baz');
            });
        });

        it('should define test', function () {
            let suitMock = new mochaStub.Suite(null);
            let pathStub = sandbox.stub();
            let parametersStub = sandbox.stub();
            let methodStub = sandbox.stub();
            let codeMock = '323';
            let examplesStub = sandbox.stub();
            let examplesMock = [
                {
                    description: 'test 1',
                    request: {
                        method: 'get'
                    },
                    response: {
                        status: 200
                    }
                },
                {
                    description: 'test 2',
                    request: {
                        method: 'post'
                    },
                    response: {
                        status: 300
                    }
                }
            ];
            let getExamplesStub = sandbox.stub(sts, 'getExamples').returns(examplesMock);

            sts.test(suitMock, pathStub, parametersStub, methodStub, codeMock, examplesStub);

            expect(getExamplesStub).to.have.been.calledWithExactly(
                pathStub, parametersStub, methodStub, 323, examplesStub);
            expect(suitMock.suits.length).to.equals(2);
            expect(suitMock.suits[0]['name']).to.eql('GET 200: test 1');
            expect(suitMock.suits[0]['test']).to.be.a.function;
            expect(suitMock.suits[1]['name']).to.eql('POST 300: test 2');
            expect(suitMock.suits[1]['test']).to.be.a.function;

            let doTestStub = sandbox.stub(sts, 'doTest');
            doTestStub.returns(doTestStub);

            let result0 = suitMock.suits[0]['test']();
            expect(doTestStub).to.have.been.calledWithExactly(examplesMock[0]);
            expect(result0).to.eql(doTestStub);

            let result1 = suitMock.suits[1]['test']();
            expect(doTestStub).to.have.been.calledWithExactly(examplesMock[1]);
            expect(result1).to.eql(doTestStub);
        });

        describe('do test', function () {
            let validateStub;
            
            beforeEach(function () {
                validateStub = sandbox.stub(sts, 'validate');
            });

            it('should test success response', function () {
                let exampleMock = {
                    request: {
                        method: 'get'
                    }
                };
                let responseStub = sandbox.stub();
                preqStub.then.yields(responseStub);

                sts.doTest(exampleMock);

                expect(preqStub.get).to.have.been.calledWithExactly(exampleMock.request);
                expect(validateStub).to.have.been.calledWithExactly(exampleMock, responseStub);
            });
            
            describe('error', function () {
                let exampleMock,
                    errorMock;
                
                beforeEach(function () {
                    exampleMock = {
                        request: {
                            method: 'post'
                        },
                        response: {}
                    };
                    errorMock = {
                        name: sandbox.stub(),
                        message: sandbox.stub()
                    };
                    preqStub.then.callsArgWith(1, errorMock);
                });

                let commotTest = function () {
                    expect(preqStub.post).to.have.been.calledWithExactly(exampleMock.request);
                    expect(validateStub).to.have.been.calledWithExactly(exampleMock, errorMock);
                };

                it('should test error response', function () {
                    exampleMock.response = {
                        name: sandbox.stub(),
                        message: sandbox.stub()
                    };

                    sts.doTest(exampleMock);

                    commotTest();
                    expect(errorMock).to.have.property('name');
                    expect(errorMock).to.have.property('message');
                });

                it('should test error response removing field', function () {
                    sts.doTest(exampleMock);

                    commotTest();
                    expect(errorMock).not.to.have.property('name');
                    expect(errorMock).not.to.have.property('message');
                });
            });
        });
        
        describe('validate', function () {
            let exampleMock,
                respMock;

            beforeEach(function () {
                exampleMock = {
                    response: {}
                };
                respMock = {
                    headers: sandbox.stub(),
                    body: sandbox.stub()
                }
            });

            let commotTest = function () {
                expect(chaiStub.expect).to.have.been.calledWithExactly(respMock);
                expect(chaiStub.eql).to.have.been.calledWithExactly(exampleMock.response);
            };

            it('should validate', function () {
                exampleMock.response = {
                    headers: sandbox.stub(),
                    body: sandbox.stub()
                };

                sts.validate(exampleMock, respMock);

                commotTest();
                expect(respMock).to.have.property('headers');
                expect(respMock).to.have.property('body');
            });

            it('should validate removing fields', function () {
                sts.validate(exampleMock, respMock);

                commotTest();
                expect(respMock).not.to.have.property('headers');
                expect(respMock).not.to.have.property('body');
            });
        });
    });
});