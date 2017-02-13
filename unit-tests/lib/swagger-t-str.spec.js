'use strict';

let chai = require('chai');
let expect = chai.expect;
let sinon = require('sinon');
let chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
let sinonChai = require('sinon-chai');
chai.use(sinonChai);
let proxyquire = require('proxyquire');

describe('The lib module', function() {
    let sandbox = sinon.sandbox.create();
    let yamlStub,
        fsStub,
        preqStub,
        mochaStub,
        chaiStub,
        chaiSubsetStub,
        swaggerToolsStub,
        programStub,
        specStub,
        STS,
        sts;

    beforeEach(function () {
        yamlStub = sandbox.stub();

        fsStub = sandbox.stub();
        fsStub.readFileSync = sandbox.stub().returns(fsStub);

        preqStub = sandbox.stub();
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

        chaiStub = sandbox.stub();
        chaiStub.use = sandbox.stub();
        chaiSubsetStub = sandbox.stub();
        chaiStub.expect = sandbox.stub().returns(chaiStub);
        chaiStub.to = chaiStub;
        chaiStub.containSubset = sandbox.stub().returns(chaiStub);

        swaggerToolsStub = sandbox.stub();
        swaggerToolsStub.specs = swaggerToolsStub;
        swaggerToolsStub.v2 = swaggerToolsStub;
        swaggerToolsStub.validateModel = sandbox.stub();

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
            'chai': chaiStub,
            'chai-subset': chaiSubsetStub,
            'swagger-tools': swaggerToolsStub
        });
        sts = new STS(programStub);
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should construct STS', function () {
        expect(chaiStub.use).to.have.been.calledWithExactly(chaiSubsetStub);

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
                addUrlParametersStub,
                addAuthStub;

            beforeEach(function () {
                pathMock = '/test_path';
                methodStub = sandbox.stub();
                codeStub = sandbox.stub();
                addUrlParametersStub = sandbox.stub(sts, 'addUrlParameters');
                addAuthStub = sandbox.stub(sts, 'addAuth');
            });

            it('should get for empty', function () {
                let expected = [
                    {
                        description: 'should return HTTP status code',
                        request: {
                            method: methodStub,
                            uri: 'test_protocol://test_host:test_port/test_base_path/test_path',
                            headers: {}
                        },
                        response: {
                            status: codeStub
                        }
                    }
                ];

                let test1 = sts.getExamples(pathMock, methodStub, codeStub, []);
                expect(test1).to.eqls(expected);
                expect(addUrlParametersStub).to.have.been.calledWithExactly(
                    pathMock, methodStub, sinon.match.object);
                expect(addAuthStub).to.have.been.calledWithExactly(
                    pathMock, methodStub, codeStub, sinon.match.object);

                let test2 = sts.getExamples(pathMock, methodStub, codeStub, undefined);
                expect(test2).to.eqls(expected);
                expect(addUrlParametersStub).to.have.been.calledWithExactly(
                    pathMock, methodStub, sinon.match.object);
                expect(addAuthStub).to.have.been.calledWithExactly(
                    pathMock, methodStub, codeStub, sinon.match.object);
            });

            it('should get samples', function () {
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

                let test = sts.getExamples(pathMock, methodStub, codeStub, examplesMock);
                expect(test).to.eqls([
                    {
                        description: 'test1',
                        request: {
                            method: methodStub,
                            uri: 'test_protocol://test_host:test_port/test_base_path/test_path',
                            headers: {}
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
                            field2: 'value2',
                            headers: {}
                        },
                        response: {
                            status: codeStub,
                            field3: 'value3'
                        }
                    }
                ]);
                expect(addUrlParametersStub).to.have.been.calledWithExactly(pathMock, methodStub, test[0]);
                expect(addAuthStub).to.have.been.calledWithExactly(pathMock, methodStub, codeStub, test[0]);
                expect(addUrlParametersStub).to.have.been.calledWithExactly(pathMock, methodStub, test[1]);
                expect(addAuthStub).to.have.been.calledWithExactly(pathMock, methodStub, codeStub, test[1]);
            });
        });

        describe('substitute parameters in url', function () {
            let pathMock,
                methodStub;

            beforeEach(function () {
                pathMock = sandbox.stub();
                methodStub = sandbox.stub();

                sts.spec = {};
                sts.spec.paths = {};
                sts.spec.paths[pathMock] = {};
                sts.spec.paths[pathMock][methodStub] = {};
            });

            it ('should do nothing on null spec parameters', function () {
                sts.addUrlParameters(pathMock, methodStub, { request: {} });
            });

            it ('should do nothing on null request parameters', function () {
                sts.spec.paths[pathMock][methodStub].parameters = [];
                sts.addUrlParameters(pathMock, methodStub, { request: {} });
            });

            it ('should do nothing on empty spec parameters', function () {
                sts.spec.paths[pathMock][methodStub].parameters = [];
                sts.addUrlParameters(pathMock, methodStub, { request: { parameters: {} } });
            });

            it ('should do nothing on fake `in` parameter', function () {
                sts.spec.paths[pathMock][methodStub].parameters = [ { in: 'fake' } ];
                sts.addUrlParameters(pathMock, methodStub, { request: { parameters: {} } });
            });

            it ('should do nothing on missing path parameter in request', function () {
                sts.spec.paths[pathMock][methodStub].parameters = [ { in: 'path', name: 'fake' } ];
                sts.addUrlParameters(pathMock, methodStub, { request: { parameters: {} } });
            });

            it ('should substitute', function () {
                sts.spec.paths[pathMock][methodStub].parameters = [
                    {
                        in: 'path',
                        name: 'param1'
                    },
                    {
                        in: 'path',
                        name: 'param2'
                    }
                ];
                let example = {
                    request: {
                        uri: 'http://localhost/foo/{param1}/{param2}',
                        parameters: {
                            param1: 'bar',
                            param2: 'baz'
                        }
                    }
                };

                sts.addUrlParameters(pathMock, methodStub, example);

                expect(example.request.uri).to.eql('http://localhost/foo/bar/baz');
                expect(example.request.parameters).not.to.have.property('param1');
                expect(example.request.parameters).not.to.have.property('param2');
            });
        });
        
        describe('add auth', function () {
            let pathMock,
                methodStub,
                codeStub;

            beforeEach(function () {
                pathMock = sandbox.stub();
                methodStub = sandbox.stub();
                codeStub = sandbox.stub();

                sts.spec = {};
                sts.spec.paths = {};
                sts.spec.paths[pathMock] = {};
                sts.spec.paths[pathMock][methodStub] = {};
            });

            it('should do nothing when not example.auth', function () {
                sts.addAuth(pathMock, methodStub, codeStub, {});
                sts.addAuth(pathMock, methodStub, codeStub, { auth: false });
            });

            it('should do nothing when x-ample not defined', function () {
                sts.spec.securityDefinitions = {
                    Test: {}
                };
                sts.spec.paths[pathMock][methodStub].security = [
                    {
                        Test: []
                    }
                ];

                sts.addAuth(pathMock, methodStub, codeStub, {});
                sts.addAuth(pathMock, methodStub, codeStub, { auth: true });
            });

            it('should do nothing when non-basic non-header', function () {
                sts.spec.securityDefinitions = {
                    Test: {
                        type: 'foo',
                        in: 'bar',
                        'x-ample': 'baz'
                    }
                };
                sts.spec.paths[pathMock][methodStub].security = [
                    {
                        Test: []
                    }
                ];

                sts.addAuth(pathMock, methodStub, codeStub, { auth: true });
            });

            it('should add basic auth', function () {
                sts.spec.securityDefinitions = {
                    Basic: {
                        type: 'basic',
                        'x-ample': 'test basic'
                    }
                };
                sts.spec.paths[pathMock][methodStub].security = [
                    {
                        Basic: []
                    }
                ];
                let exampleMock = {
                    auth: true,
                    request: {
                        headers: {}
                    }
                };

                sts.addAuth(pathMock, methodStub, codeStub, exampleMock);

                expect(exampleMock.request.headers).to.eql({ Authorization: 'test basic' });
            });

            it('should add token auth', function () {
                sts.spec.securityDefinitions = {
                    Basic: {
                        type: 'foo',
                        in: 'header',
                        name: 'Bar',
                        'x-ample': 'test foo bar'
                    }
                };
                sts.spec.paths[pathMock][methodStub].security = [
                    {
                        Basic: []
                    }
                ];
                let exampleMock = {
                    auth: true,
                    request: {
                        headers: {}
                    }
                };

                sts.addAuth(pathMock, methodStub, codeStub, exampleMock);

                expect(exampleMock.request.headers).to.eql({ Bar: 'test foo bar' });
            });
        });

        it('should define test', function () {
            let suitMock = new mochaStub.Suite(null);
            let pathStub = sandbox.stub();
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

            sts.test(suitMock, pathStub, methodStub, codeMock, examplesStub);

            expect(getExamplesStub).to.have.been.calledWithExactly(pathStub, methodStub, 323, examplesStub);
            expect(suitMock.suits.length).to.equals(2);
            expect(suitMock.suits[0]['name']).to.eql('GET 200: test 1');
            expect(suitMock.suits[0]['test']).to.be.a('function');
            expect(suitMock.suits[1]['name']).to.eql('POST 300: test 2');
            expect(suitMock.suits[1]['test']).to.be.a('function');

            sts.spec.paths = {};
            sts.spec.paths[pathStub] = {};
            sts.spec.paths[pathStub][methodStub] = {};
            sts.spec.paths[pathStub][methodStub].responses = {};
            sts.spec.paths[pathStub][methodStub].responses[codeMock] = {};
            let schemaStub = sts.spec.paths[pathStub][methodStub].responses[codeMock].schema = sandbox.stub();

            let doTestStub = sandbox.stub(sts, 'doTest');

            suitMock.suits[0]['test']();
            expect(doTestStub).to.have.been.calledWithExactly(schemaStub, examplesMock[0]);

            suitMock.suits[1]['test']();
            expect(doTestStub).to.have.been.calledWithExactly(schemaStub, examplesMock[1]);
        });
        
        describe('testing example', function () {
            let schemaStub,
                exampleStub,
                responseStub;

            beforeEach(function () {
                schemaStub = sandbox.stub();
                exampleStub = sandbox.stub();
                responseStub = sandbox.stub();
                exampleStub.response = sandbox.stub();
            });

            it('should do test', function () {
                let validatorStub = sandbox.stub(sts, 'getValidator');
                validatorStub.returns(validatorStub);
                exampleStub.request = sandbox.stub();
                exampleStub.request.method = sandbox.stub();
                preqStub[exampleStub.request.method] = sandbox.stub().returns(preqStub);

                let promise = sts.doTest(schemaStub, exampleStub);

                expect(validatorStub).to.have.been.calledWithExactly(schemaStub, exampleStub);
                expect(preqStub[exampleStub.request.method]).to.have.been.calledWithExactly(exampleStub.request);
                expect(preqStub.then).to.have.been.calledWithExactly(validatorStub, validatorStub);
                expect(promise).to.equals(preqStub);
            });

            it('should return validator', function () {
                let validator = sts.getValidator(schemaStub, exampleStub);
                expect(validator).to.be.a('function');

                let promiseMock = sandbox.stub();
                let doValidateStub = sandbox.stub(sts, 'doValidate').returns(promiseMock);

                let promise = validator(responseStub);

                expect(doValidateStub).to.have.been.calledWithExactly(schemaStub, exampleStub, responseStub);
                expect(promise).to.equals(promiseMock);
            });

            describe('validate', function () {
                let commonTest = function (promise) {
                    expect(promise).to.be.undefined;
                    expect(chaiStub.expect).to.have.been.calledWithExactly(responseStub);
                    expect(chaiStub.containSubset).to.have.been.calledWithExactly(exampleStub.response);
                };

                it('should validate with no schema', function () {
                    commonTest(sts.doValidate(null, exampleStub, responseStub));
                });

                it('should validate with no $ref', function () {
                    commonTest(sts.doValidate(schemaStub, exampleStub, responseStub));
                });

                it('should validate with no body', function () {
                    schemaStub['$ref'] = sandbox.stub();
                    commonTest(sts.doValidate(schemaStub, exampleStub, responseStub));
                });

                it('should validate with schema', function () {
                    schemaStub['$ref'] = sandbox.stub();
                    responseStub.body = sandbox.stub();
                    let promiseStub = sandbox.stub();
                    let doValidateSwaggerSchemaStub =
                        sandbox.stub(sts, 'doValidateSwaggerSchema').returns(promiseStub);

                    let promise = sts.doValidate(schemaStub, exampleStub, responseStub);

                    expect(chaiStub.expect).to.have.been.calledWithExactly(responseStub);
                    expect(chaiStub.containSubset).to.have.been.calledWithExactly(exampleStub.response);
                    expect(doValidateSwaggerSchemaStub).to.have.been.calledWithExactly(
                        schemaStub['$ref'], responseStub.body);
                    expect(promise).to.equals(promiseStub);
                });
            });
        });

        describe('validate swagger schema', function () {
            let refStub,
                bodyStub;

            beforeEach(function () {
                refStub = sandbox.stub();
                bodyStub = sandbox.stub();
            });

            let commonTest = function (promise) {
                expect(promise).to.be.a('promise');
                expect(swaggerToolsStub.validateModel).to.have.been.calledWithExactly(
                    sts.spec, refStub, bodyStub, sinon.match.func);
            };

            it('should validate', function () {
                swaggerToolsStub.validateModel.callsArg(3);

                let promise = sts.doValidateSwaggerSchema(refStub, bodyStub);

                commonTest(promise);

                return expect(promise).to.be.fulfilled;
            });

            it('should fail', function () {
                let errorMock = new Error('test error');
                swaggerToolsStub.validateModel.callsArgWith(3, errorMock);

                let promise = sts.doValidateSwaggerSchema(refStub, bodyStub);

                commonTest(promise);

                return expect(promise).to.be.rejectedWith(errorMock);
            });

            it('should fail validating body against schema', function () {
                let resultMock = {
                    errors: [
                        {
                            path: ['1', '2'],
                            message: '3'
                        },
                        {
                            path: ['4', '5'],
                            message: '6'
                        }
                    ]
                };
                swaggerToolsStub.validateModel.callsArgWith(3, null, resultMock);

                let promise = sts.doValidateSwaggerSchema(refStub, bodyStub);

                commonTest(promise);

                return expect(promise).to.be.rejectedWith(Error, 'Validation failed:\n' +
                    '#/1/2: 3\n' +
                    '#/4/5: 6');
            });
        });
    });
});