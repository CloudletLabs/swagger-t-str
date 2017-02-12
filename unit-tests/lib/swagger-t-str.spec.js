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
        mochaStub = function Mocha() { };
        mochaStub.Suite = sandbox.stub();
        mochaStub.Suite.create = sandbox.stub().returns(mochaStub);
        mochaStub.prototype.suite = sandbox.stub();
        mochaStub.prototype.run = sandbox.stub();
        mochaStub.prototype.addSuite = sandbox.stub().returns(mochaStub);
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
            let addSuitStub = sandbox.stub(sts, 'addSuit');
            addSuitStub.returns(addSuitStub);
            let getTestsStub = sandbox.stub(sts, 'getExamples');
            getTestsStub.returns(getTestsStub);
            let doTestStub = sandbox.stub(sts, 'test');
            let callbackStub = sandbox.stub();

            sts.start(callbackStub);

            expect(getTestsStub).to.have.been.callCount(4);
            expect(addSuitStub).to.have.been.callCount(9);
            expect(addSuitStub).to.have.been.calledWithExactly('/test1');
            expect(addSuitStub).to.have.been.calledWithExactly('get', addSuitStub);
            expect(addSuitStub).to.have.been.calledWithExactly('200', addSuitStub);
            expect(getTestsStub).to.have.been.calledWithExactly('/test1', 'get', 200, ['ex1', 'ex2']);
            expect(addSuitStub).to.have.been.calledWithExactly('post', addSuitStub);
            expect(addSuitStub).to.have.been.calledWithExactly('300', addSuitStub);
            expect(getTestsStub).to.have.been.calledWithExactly('/test1', 'post', 300, ['ex3']);
            expect(addSuitStub).to.have.been.calledWithExactly('400', addSuitStub);
            expect(getTestsStub).to.have.been.calledWithExactly('/test1', 'post', 400, []);
            expect(addSuitStub).to.have.been.calledWithExactly('/test2');
            expect(addSuitStub).to.have.been.calledWithExactly('put', addSuitStub);
            expect(addSuitStub).to.have.been.calledWithExactly('500', addSuitStub);
            expect(getTestsStub).to.have.been.calledWithExactly('/test2', 'put', 500, []);
            expect(doTestStub).to.have.been.calledWithExactly(addSuitStub, getTestsStub).callCount(4);
            expect(mochaStub.prototype.run).to.have.been.calledWithExactly(callbackStub);
        });

        it('should create root suite', function () {
            let sts = new STS(programStub);
            let nameStub = sandbox.stub();

            expect(sts.addSuit(nameStub)).to.equals(mochaStub);

            expect(mochaStub.Suite.create).to.have.been.calledWithExactly(mochaStub.prototype.suite, nameStub);
        });

        it('should create child suite', function () {
            let sts = new STS(programStub);
            let nameStub = sandbox.stub();
            mochaStub.addSuite = sandbox.stub().returns(mochaStub);

            expect(sts.addSuit(nameStub, mochaStub)).to.equals(mochaStub);

            expect(mochaStub.Suite.create).to.have.been.calledWithExactly(mochaStub.prototype.suite, nameStub);
            expect(mochaStub.addSuite).to.have.been.calledWithExactly(mochaStub);
        });

        describe('get examples', function () {
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
                let test = sts.getExamples(pathStub, methodStub, codeStub, examplesMock);
                expect(test).to.eqls([
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
                ]);
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
                let test = sts.getExamples(pathStub, methodStub, codeStub, examplesMock);
                expect(test).to.eqls([
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
                ]);
            });
        });

        it('should define test', function () {
            let testMock = [
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
            let suitStub = sandbox.stub();
            suitStub.addTest = sandbox.stub();
            let responseStub = sandbox.stub();
            preqStub.then = sandbox.stub().yields(responseStub);

            let sts = new STS(programStub);
            sts.test(suitStub, testMock);

            expect(suitStub.addTest).to.have.been.called.callCount(2);
            expect(suitStub.addTest.args[0][0].name).to.eql('GET 200: test 1');
            expect(suitStub.addTest.args[0][0].test).to.be.function;
            expect(suitStub.addTest.args[1][0].name).to.eql('POST 300: test 2');
            expect(suitStub.addTest.args[1][0].test).to.be.function;

            suitStub.addTest.args[0][0].test();
            suitStub.addTest.args[1][0].test();

            expect(preqStub.get).to.have.been.calledWithExactly(testMock[0].request);
            expect(preqStub.post).to.have.been.calledWithExactly(testMock[1].request);
            expect(chaiStub.expect).to.have.been.calledWithExactly(responseStub).callCount(2);
            expect(chaiStub.eql).to.have.been.calledWithExactly(testMock[0].response);
            expect(chaiStub.eql).to.have.been.calledWithExactly(testMock[1].response);
        });
    });

});