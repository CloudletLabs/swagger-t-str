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
        STS;

    beforeEach(function () {
        yamlStub = sandbox.stub();
        fsStub = sandbox.stub();
        fsStub.readFileSync = sandbox.stub().returns(fsStub);
        preqStub = sandbox.stub();
        preqStub.get = sandbox.stub().returns(preqStub);
        preqStub.post = sandbox.stub().returns(preqStub);
        preqStub.put = sandbox.stub().returns(preqStub);
        preqStub.delete = sandbox.stub().returns(preqStub);
        mochaStub = sandbox.stub();
        mochaStub.describe = sandbox.stub().yields();
        mochaStub.it = sandbox.stub();
        mochaStub.it.withArgs(sinon.match.string, sinon.match.func).yields();
        sinonStub = sandbox.stub();
        chaiStub = sandbox.stub();
        chaiStub.use = sandbox.stub();
        sinonChaiStub = sandbox.stub();
        chaiStub.expect = sandbox.stub().returns(chaiStub);
        chaiStub.to = chaiStub;
        chaiStub.eq = sandbox.stub().returns(chaiStub);
        programStub = sandbox.stub();
        programStub.protocol = 'test_protocol';
        programStub.host = 'test_host';
        programStub.port = 'test_port';
        programStub.spec = sandbox.stub();
        specStub = sandbox.stub();
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
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should construct STS', function () {
        expect(chaiStub.use).to.have.been.calledWithExactly(sinonChaiStub);

        let sts = new STS(programStub);
        expect(sts.spec).to.equals(specStub);
        expect(sts.uri).to.equals('test_protocol://test_host:test_portundefined');
        expect(fsStub.readFileSync).to.have.been.calledWithExactly(programStub.spec, 'utf8');
        expect(yamlStub.safeLoad).to.have.been.calledWithExactly(fsStub);
    });

    describe('STS', function () {
        it('should start', function () {
            let sts = new STS(programStub);

            let test1Stub = sandbox.stub();
            let test2Stub = sandbox.stub();
            let getTestsStub = sandbox.stub(sts, 'getTests').returns([test1Stub, test2Stub]);
            let testsStub = sandbox.stub(sts, 'test');

            sts.start();

            expect(getTestsStub).to.have.been.calledWithExactly();
            expect(testsStub).to.have.been.calledWithExactly(test1Stub);
            expect(testsStub).to.have.been.calledWithExactly(test2Stub);
        });

        it('should get tests', function () {
            let sts = new STS(programStub);
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
                            responses: {
                                500: {
                                    'x-amples': []
                                }
                            }
                        }
                    }
                }
            };
            let getTestStub = sandbox.stub(sts, 'getTest');
            getTestStub.returns(getTestStub);

            let tests = sts.getTests();

            expect(tests.length).to.equals(4);
            expect(getTestStub).to.have.been.callCount(4);
            expect(getTestStub).to.have.been.calledWithExactly('/test1', 'get', 200, ['ex1', 'ex2']);
            expect(getTestStub).to.have.been.calledWithExactly('/test1', 'post', 300, ['ex3']);
            expect(getTestStub).to.have.been.calledWithExactly('/test1', 'post', 400, []);
            expect(getTestStub).to.have.been.calledWithExactly('/test2', 'put', 500, []);
        });

        describe('get test', function () {
            let pathStub,
                methodStub,
                codeStub;
            
            beforeEach(function () {
                pathStub = sandbox.stub();
                methodStub = sandbox.stub();
                codeStub = sandbox.stub();
            });

            it('should get for empty', function () {
                let examplesMock = [];

                let sts = new STS(programStub);
                let test = sts.getTest(pathStub, methodStub, codeStub, examplesMock);
                expect(test).to.eqls({
                    path: pathStub,
                    method: methodStub,
                    examples: [
                        {
                            description: 'default',
                            request: {
                                method: methodStub,
                                uri: 'test_protocol://test_host:test_portundefinedstub'
                            },
                            response: {
                                status: codeStub
                            }
                        }
                    ]
                });
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

                let sts = new STS(programStub);
                let test = sts.getTest(pathStub, methodStub, codeStub, examplesMock);
                expect(test).to.eqls({
                    path: pathStub,
                    method: methodStub,
                    examples: [
                        {
                            description: 'test1',
                            request: {
                                method: methodStub,
                                uri: 'test_protocol://test_host:test_portundefinedstub'
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
                                uri: 'test_protocol://test_host:test_portundefinedstub',
                                field2: 'value2'
                            },
                            response: {
                                status: codeStub,
                                field3: 'value3'
                            }
                        }
                    ]
                });
            });
        });

        it('should define test', function () {
            let testMock = {
                path: 'test path',
                method: 'test method',
                examples: [
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
                ]
            };
            let responseStub = sandbox.stub();
            preqStub.then = sandbox.stub().yields(responseStub);

            let sts = new STS(programStub);
            sts.test(testMock);

            expect(mochaStub.describe).to.have.been.calledWithExactly('test path', sinon.match.func);
            expect(mochaStub.describe).to.have.been.calledWithExactly('test method', sinon.match.func);
            expect(mochaStub.it).to.have.been.calledWithExactly('200: test 1', sinon.match.func);
            expect(preqStub.get).to.have.been.calledWithExactly(testMock.examples[0].request);
            expect(preqStub.post).to.have.been.calledWithExactly(testMock.examples[1].request);
            expect(chaiStub.expect).to.have.been.calledWithExactly(responseStub).callCount(2);
            expect(chaiStub.eq).to.have.been.calledWithExactly(testMock.examples[0].response);
            expect(chaiStub.eq).to.have.been.calledWithExactly(testMock.examples[1].response);
        });
    });

});