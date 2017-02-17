'use strict';

let sinon = require('sinon');
let chai = require('chai');
let expect = chai.expect;
let sinonChai = require('sinon-chai');
chai.use(sinonChai);
let proxyquire = require('proxyquire');

describe('STS module', function() {
    //noinspection JSUnresolvedVariable
    let sandbox = sinon.sandbox.create();
    let yamlStub,
        fsStub,
        mochaConstructorSpy,
        mochaMock,
        swaggerClientSpy,
        swaggerClientMock,
        exampleHandlerSpy,
        exampleHandlerMock,
        urlStub,
        specPathStub,
        STS,
        sts;

    beforeEach(function () {
        yamlStub = sandbox.stub();
        fsStub = sandbox.stub();
        mochaConstructorSpy = sandbox.spy();
        mochaMock = function () {
            //noinspection JSCheckFunctionSignatures
            mochaConstructorSpy.apply(this, arguments);
        };
        swaggerClientSpy = sandbox.spy();
        swaggerClientMock = function () {
            //noinspection JSCheckFunctionSignatures
            swaggerClientSpy.apply(this, arguments);
        };
        exampleHandlerSpy = sandbox.spy();
        exampleHandlerMock = function () {
            //noinspection JSCheckFunctionSignatures
            exampleHandlerSpy.apply(this, arguments);
        };

        urlStub = sandbox.stub();
        specPathStub = sandbox.stub();

        STS = proxyquire('../../lib/swagger-t-str', {
            'js-yaml': yamlStub,
            'fs': fsStub,
            'mocha': mochaMock,
            'swagger-client': swaggerClientMock,
            './STSExampleHandler': exampleHandlerMock
        });
        sts = new STS(urlStub, specPathStub);
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should construct STS', function () {
        expect(sts.url).to.equals(urlStub);
        expect(sts.specPath).to.equals(specPathStub);
    });

    it('should start', function () {
        let callbackStub = sandbox.stub();
        let promiseStub = sandbox.stub();
        let loadSpecStub = sandbox.stub(sts, 'loadSpec');
        let createClientStub = sandbox.stub(sts, 'createClient').returns(promiseStub);

        let promise = sts.start(callbackStub);

        expect(sts.callback).to.equals(callbackStub);
        expect(loadSpecStub).to.calledWithExactly();
        expect(createClientStub).to.calledWithExactly();
        expect(promise).to.equals(promiseStub);
    });

    it('should load spec', function () {
        sts.specPath = sandbox.stub();
        let fileStub = sandbox.stub();
        fsStub.readFileSync = sandbox.stub().returns(fileStub);
        let specStub = sandbox.stub();
        yamlStub.safeLoad = sandbox.stub();
        yamlStub.safeLoad = sandbox.stub().returns(specStub);

        sts.loadSpec();

        expect(fsStub.readFileSync).to.calledWithExactly(sts.specPath, 'utf8');
        expect(yamlStub.safeLoad).to.calledWithExactly(fileStub);
        expect(sts.spec).to.equals(specStub);
    });

    it('should create client', function () {
        sts.url = sandbox.stub();
        sts.spec = sandbox.stub();
        swaggerClientMock.prototype.then = sandbox.stub().returns(swaggerClientMock.prototype);
        swaggerClientMock.prototype.catch = sandbox.stub().returns(swaggerClientMock);
        let thenStub = sandbox.stub();
        let onClientReadyStub = sandbox.stub(sts, 'onClientReady').returns(thenStub);
        let catchStub = sandbox.stub();
        let onClientErrorStub = sandbox.stub(sts, 'onClientError').returns(catchStub);

        let client = sts.createClient();

        expect(swaggerClientSpy).to.calledWithExactly({
            url: sts.url,
            spec: sts.spec,
            enableCookies: true,
            usePromise: true
        });
        expect(onClientReadyStub).to.calledWithExactly();
        expect(swaggerClientMock.prototype.then).to.calledWithExactly(thenStub);
        expect(onClientErrorStub).to.calledWithExactly();
        expect(swaggerClientMock.prototype.catch).to.calledWithExactly(catchStub);
        expect(client).to.equals(swaggerClientMock);
    });

    it('should build root suite on client ready', function () {
        let clientStub = sandbox.stub();
        sts.spec = sandbox.stub();
        let buildRootSuiteStub = sandbox.stub(sts, 'buildRootSuite');

        sts.onClientReady()(clientStub);

        expect(sts.client).to.equals(clientStub);
        expect(exampleHandlerSpy).to.calledWithExactly(sts.spec, clientStub);
        expect(buildRootSuiteStub).to.calledWithExactly();
        expect(sts.exampleValidator).to.be.an.instanceof(exampleHandlerMock);
    });

    it('should callback on client error', function () {
        let errorStub = sandbox.stub();
        sts.callback = sandbox.stub();
        let consoleErrorStub = sandbox.stub(console, 'error');

        sts.onClientError()(errorStub);

        expect(consoleErrorStub).to.calledWithExactly(errorStub);
        expect(sts.callback).to.calledWithExactly(-1);
    });

    it('should find operation by path:method', function () {
        sts.client = {
            default: {
                operations: {
                    operation1: {
                        path: 'foo',
                        method: 'bar'
                    },
                    operation2: {
                        path: 'bi',
                        method: 'ngo'
                    },
                    operation3: {
                        path: 'bar',
                        method: 'foo'
                    }
                }
            }
        };

        let operation = sts.findOperation('bi', 'ngo');

        expect(operation).to.eql({
            path: 'bi',
            method: 'ngo'
        });
    });

    it('should get responses with no successResponse', function () {
        let resultStub = sandbox.stub();
        let assignStub = sandbox.stub(Object, 'assign').returns(resultStub);
        let operationsMock = {
            responses: sandbox.stub()
        };

        let result = sts.hackSuccessResponse(operationsMock);

        expect(assignStub).to.calledWithExactly({}, operationsMock.responses);
        expect(result).to.equals(resultStub);
    });

    it('should get responses with successResponse', function () {
        let examplesStub = sandbox.stub();
        let operationsMock = {
            path: 'foo',
            method: 'bar',
            responses: {
                resp1: {},
                resp2: {}
            },
            successResponse: {
                resp3: {}
            }
        };
        sts.spec = {
            paths: {
                foo: {
                    bar: {
                        responses: {
                            resp3: {
                                'x-amples': examplesStub
                            }
                        }
                    }
                }
            }
        };

        let responses = sts.hackSuccessResponse(operationsMock);

        expect(responses).to.not.equals(operationsMock);
        expect(Object.keys(responses)).to.eql(['resp3', 'resp1', 'resp2']);
        expect(responses).to.eql({
            resp1: {},
            resp2: {},
            resp3: {
                'x-amples': examplesStub
            }
        });
    });

    it('should build root suite', function () {
        sts.url = 'http://example.com';
        sts.client = {
            swaggerObject: {
                paths: {
                    foo: {},
                    '/bar': {},
                    '/baz': {}
                }
            },
            info: {
                title: 'foo bar'
            }
        };
        sts.callback = sandbox.stub();
        let suiteSpy = sandbox.spy();
        mochaMock.Suite = function () {
            //noinspection JSCheckFunctionSignatures
            suiteSpy.apply(this, arguments);
        };
        mochaMock.prototype.suite = sandbox.stub();
        mochaMock.prototype.suite.addSuite = sandbox.stub();
        mochaMock.prototype.run = sandbox.stub();
        let handlePathStub = sandbox.stub(sts, 'handlePath');

        sts.buildRootSuite();

        expect(mochaConstructorSpy).to.calledWith();
        expect(suiteSpy).to.calledWithExactly('http://example.com: foo bar');
        expect(sts.serverSuite).to.be.an.instanceof(mochaMock.Suite);
        //noinspection JSUnresolvedVariable
        expect(mochaMock.prototype.suite.addSuite).to.calledWith(sts.serverSuite);
        expect(handlePathStub).to.calledTwice;
        expect(handlePathStub.firstCall).to.calledWithExactly('/bar');
        expect(handlePathStub.secondCall).to.calledWithExactly('/baz');
        expect(mochaMock.prototype.run).to.calledWithExactly(sts.callback);
    });

    it('should handle path', function () {
        sts.client = {
            swaggerObject: {
                paths: {
                    foo: {
                        'foo': {},
                        'get': {},
                        'head': {},
                        'post': {},
                        'put': {},
                        'delete': {},
                        'connect': {},
                        'options': {},
                        'trace': {},
                        'patch': {},
                        'bar': {}
                    }
                }
            }
        };
        let handleMethodStub = sandbox.stub(sts, 'handleMethod');

        sts.handlePath('foo');

        let knownMethods = ['get','head','post','put','delete','connect','options','trace','patch'];
        expect(handleMethodStub.callCount).to.equals(9);
        for (let method of knownMethods) {
            expect(handleMethodStub).to.calledWithExactly('foo', method);
        }
    });

    it('should handle method', function () {
        let stub = sandbox.stub();
        let suiteMock = stub;
        let suiteSpy = sandbox.spy();
        mochaMock.Suite = function () {
            suiteMock = this;
            //noinspection JSCheckFunctionSignatures
            suiteSpy.apply(this, arguments);
        };
        sts.serverSuite = {
            addSuite: sandbox.stub()
        };
        let operationStub = sandbox.stub();
        let findOperationStub = sandbox.stub(sts, 'findOperation').returns(operationStub);
        let responsesMock = {
            '200': {},
            '401': {}
        };
        let hackSuccessResponseStub = sandbox.stub(sts, 'hackSuccessResponse').returns(responsesMock);
        let handleResponseStub = sandbox.stub(sts, 'handleResponse');

        sts.handleMethod('/foo', 'bar');

        expect(suiteSpy).to.calledWithExactly('BAR /foo');
        expect(suiteMock).not.equals(stub);
        expect(sts.serverSuite.addSuite).to.calledWithExactly(suiteMock);
        expect(findOperationStub).to.calledWithExactly('/foo', 'bar');
        expect(hackSuccessResponseStub).to.calledWithExactly(operationStub);
        expect(handleResponseStub.callCount).to.equals(Object.keys(responsesMock).length);
        expect(handleResponseStub).to.calledWithExactly(suiteMock, operationStub, '200');
        expect(handleResponseStub).to.calledWithExactly(suiteMock, operationStub, '401');
    });

    describe('response handling', function () {
        let suiteStub,
            operationStub,
            responseCodeMock,
            handleExampleStub;

        beforeEach(function () {
            suiteStub = sandbox.stub();
            sts.spec = {
                paths: {
                    '/foo': {
                        'bar': {
                            responses: {
                                'baz': { }
                            }
                        }
                    }
                }
            };
            operationStub = sandbox.stub();
            operationStub.path = '/foo';
            operationStub.method = 'bar';
            responseCodeMock = 'baz';
            handleExampleStub = sandbox.stub(sts, 'handleExample');
        });

        let emptyTest = function () {
            expect(handleExampleStub).to.calledOnce;
            expect(handleExampleStub).to.calledWithExactly(suiteStub, operationStub, responseCodeMock,
                { description: 'should return expected HTTP status code' });
        };

        it('should handle response with no x-amples', function () {
            sts.handleResponse(suiteStub, operationStub, responseCodeMock);
            emptyTest();
        });

        it('should handle response with empty x-amples', function () {
            sts.spec.paths[operationStub.path][operationStub.method].responses[responseCodeMock]['x-amples'] = [];
            sts.handleResponse(suiteStub, operationStub, responseCodeMock);
            emptyTest();
        });

        it('should handle response with x-amples', function () {
            let exemple1Stub = sandbox.stub();
            let exemple2Stub = sandbox.stub();
            sts.spec.paths[operationStub.path][operationStub.method].responses[responseCodeMock]['x-amples'] = [
                exemple1Stub, exemple2Stub
            ];
            sts.handleResponse(suiteStub, operationStub, responseCodeMock);
            expect(handleExampleStub).to.calledTwice;
            expect(handleExampleStub).to.calledWithExactly(suiteStub, operationStub, responseCodeMock, exemple1Stub);
            expect(handleExampleStub).to.calledWithExactly(suiteStub, operationStub, responseCodeMock, exemple2Stub);
        });
    });

    it('should handle example', function () {
        let suiteStub = sandbox.stub();
        suiteStub.addTest = sandbox.stub();
        let operationStub = sandbox.stub();
        let responseCodeMock = 'foo';
        let exampleMock = {
            description: 'bar'
        };
        let stub = sandbox.stub();
        let testMock = stub;
        let testSpy = sandbox.spy();
        mochaMock.Test = function () {
            //noinspection JSCheckFunctionSignatures
            testSpy.apply(this, arguments);
            testMock = this;
        };
        sts.exampleValidator = {
            handle: sandbox.stub()
        };

        sts.handleExample(suiteStub, operationStub, responseCodeMock, exampleMock);

        //noinspection JSUnresolvedVariable
        expect(testSpy).to.calledWithExactly('foo: bar', sinon.match.func);
        expect(testMock).not.equals(stub);
        expect(suiteStub.addTest).to.calledWithExactly(testMock);

        testSpy.firstCall.args[1]();

        expect(sts.exampleValidator.handle).to.calledWithExactly(operationStub, responseCodeMock, exampleMock);
    });
});