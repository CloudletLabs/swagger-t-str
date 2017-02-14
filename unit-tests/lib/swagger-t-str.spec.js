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

        mochaStub = function Mocha() { };

        chaiStub = sandbox.stub();
        chaiStub.use = sandbox.stub();
        chaiSubsetStub = sandbox.stub();

        swaggerToolsStub = sandbox.stub();

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

    it('should configure chai', function () {
        expect(chaiStub.use).to.have.been.calledWithExactly(chaiSubsetStub);
    });

    describe('STS', function () {
        it('should construct STS', function () {
            expect(sts.spec).to.equals(specStub);
            expect(sts.uri).to.equals('test_protocol://test_host:test_port/test_base_path');
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

                let doTestStub = sandbox.stub(sts, 'doTest');

                suitMock.suits[0]['test']();
                expect(doTestStub).to.have.been.calledWithExactly(exampleMock);
            });
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

        it('should get samples', function () {
            let pathMock = '/test_path';
            let methodStub = sandbox.stub();
            let codeStub = sandbox.stub();
            sts.spec = sandbox.stub();
            sts.spec.paths = sandbox.stub();
            sts.spec.paths[pathMock] = sandbox.stub();
            sts.spec.paths[pathMock][methodStub] = sandbox.stub();
            let specMethodParametersStub = sts.spec.paths[pathMock][methodStub].parameters = sandbox.stub();
            let specMethodSecurityStub = sts.spec.paths[pathMock][methodStub].security = sandbox.stub();
            sts.spec.paths[pathMock][methodStub].responses = sandbox.stub();
            sts.spec.paths[pathMock][methodStub].responses[codeStub] = sandbox.stub();
            let specResponseSchemaStub =
                sts.spec.paths[pathMock][methodStub].responses[codeStub].schema = sandbox.stub();
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
                    specMethodParameters: specMethodParametersStub,
                    specMethodSecurity: specMethodSecurityStub,
                    specResponseSchema: specResponseSchemaStub,
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
                    specMethodParameters: specMethodParametersStub,
                    specMethodSecurity: specMethodSecurityStub,
                    specResponseSchema: specResponseSchemaStub,
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
        });

        it('should test given example', function () {
            let exampleStub = sandbox.stub();
            exampleStub.request = sandbox.stub();
            exampleStub.request.method = sandbox.stub();
            let substituteUrlParametersStub = sandbox.stub(sts, 'substituteUrlParameters');
            let addAuthStub = sandbox.stub(sts, 'addAuth');
            let validatorStub = sandbox.stub(sts, 'getValidator');
            validatorStub.returns(validatorStub);
            preqStub[exampleStub.request.method] = sandbox.stub().returns(preqStub);
            preqStub.then = sandbox.stub().returns(preqStub);

            sts.doTest(exampleStub);

            expect(substituteUrlParametersStub).to.have.been.calledWithExactly(exampleStub);
            expect(addAuthStub).to.have.been.calledWithExactly(exampleStub);
            expect(validatorStub).to.have.been.calledWithExactly(exampleStub);
            expect(preqStub[exampleStub.request.method]).to.have.been.calledWithExactly(exampleStub.request);
            expect(preqStub.then).to.have.been.calledWithExactly(validatorStub, validatorStub);
        });

        describe('substitute parameters in url', function () {
            it ('should do nothing on null spec parameters', function () {
                sts.substituteUrlParameters({ request: {} });
            });

            it ('should do nothing on null request parameters', function () {
                sts.substituteUrlParameters({ specMethodParameters: [], request: {} });
            });

            it ('should do nothing on empty spec parameters', function () {
                sts.substituteUrlParameters({ specMethodParameters: [], request: { parameters: {} } });
            });

            it ('should do nothing on fake `in` parameter', function () {
                sts.substituteUrlParameters({
                    specMethodParameters: [ { in: 'fake' } ],
                    request: { parameters: {} }
                });
            });

            it ('should do nothing on missing path parameter in request', function () {
                sts.substituteUrlParameters({
                    specMethodParameters: [ { in: 'path', name: 'fake' } ],
                    request: { parameters: {} }
                });
            });

            it ('should substitute', function () {
                let example = {
                    specMethodParameters: [
                        {
                            in: 'path',
                            name: 'param1'
                        },
                        {
                            in: 'path',
                            name: 'param2'
                        }
                    ],
                    request: {
                        uri: 'http://localhost/foo/{param1}/{param2}',
                        parameters: {
                            param1: 'bar',
                            param2: 'baz'
                        }
                    }
                };

                sts.substituteUrlParameters(example);

                expect(example.request.uri).to.eql('http://localhost/foo/bar/baz');
                expect(example.request.parameters).not.to.have.property('param1');
                expect(example.request.parameters).not.to.have.property('param2');
            });
        });

        describe('add auth', function () {
            it('should do nothing when not example.auth', function () {
                sts.addAuth({});
                sts.addAuth({ auth: false });
            });

            it('should do nothing when x-ample not defined', function () {
                sts.spec.securityDefinitions = {
                    Test: {}
                };

                sts.addAuth({
                    auth: true,
                    specMethodSecurity: [
                        {
                            Test: []
                        }
                    ]
                });
            });

            it('should do nothing when non-basic non-header', function () {
                sts.spec.securityDefinitions = {
                    Test: {
                        type: 'foo',
                        in: 'bar',
                        'x-ample': 'baz'
                    }
                };

                sts.addAuth({
                    auth: true,
                    specMethodSecurity: [
                        {
                            Test: []
                        }
                    ]
                });
            });

            it('should add basic auth', function () {
                sts.spec.securityDefinitions = {
                    Basic: {
                        type: 'basic',
                        'x-ample': 'test basic'
                    }
                };
                let exampleMock = {
                    auth: true,
                    specMethodSecurity: [
                        {
                            Basic: []
                        }
                    ],
                    request: {
                        headers: {}
                    }
                };

                sts.addAuth(exampleMock);

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
                let exampleMock = {
                    auth: true,
                    specMethodSecurity: [
                        {
                            Basic: []
                        }
                    ],
                    request: {
                        headers: {}
                    }
                };

                sts.addAuth(exampleMock);

                expect(exampleMock.request.headers).to.eql({ Bar: 'test foo bar' });
            });
        });
        
        it('should get validator', function () {
            let exampleStub = sandbox.stub();
            let validator = sts.getValidator(exampleStub);
            expect(validator).to.be.a('function');

            let respStub = sandbox.stub();
            let promiseStub = sandbox.stub();
            let doValidateStub = sandbox.stub(sts, 'doValidate').returns(promiseStub);
            let promise = validator(respStub);
            expect(promise).to.equals(promiseStub);
            expect(doValidateStub).to.have.been.calledWithExactly(exampleStub, respStub);
        });

        describe('validating response', function () {
            let exampleStub,
                responseStub;

            beforeEach(function () {
                exampleStub = sandbox.stub();
                exampleStub.response = sandbox.stub();
                responseStub = sandbox.stub();

                chaiStub.expect = sandbox.stub().returns(chaiStub);
                chaiStub.to = chaiStub;
                chaiStub.containSubset = sandbox.stub().returns(chaiStub);
            });

            let commonTest = function (promise) {
                expect(promise).to.be.undefined;
                expect(chaiStub.expect).to.have.been.calledWithExactly(responseStub);
                expect(chaiStub.containSubset).to.have.been.calledWithExactly(exampleStub.response);
            };

            it('should validate', function () {
                commonTest(sts.doValidate(exampleStub, responseStub));
            });

            it('should validate with authProviderFor', function () {
                exampleStub.authProviderFor = sandbox.stub();
                let dispatchAuthStub = sandbox.stub(sts, 'dispatchAuth');

                commonTest(sts.doValidate(exampleStub, responseStub));
                expect(dispatchAuthStub).to.have.been.calledWithExactly(exampleStub.authProviderFor, responseStub);
            });

            it('should validate with no $ref', function () {
                exampleStub.specResponseSchema = sandbox.stub();
                commonTest(sts.doValidate(exampleStub, responseStub));
            });

            it('should validate with no body', function () {
                exampleStub.specResponseSchema = sandbox.stub();
                exampleStub.specResponseSchema['$ref'] = sandbox.stub();
                commonTest(sts.doValidate(exampleStub, responseStub));
            });

            it('should validate with schema', function () {
                exampleStub.specResponseSchema = sandbox.stub();
                exampleStub.specResponseSchema['$ref'] = sandbox.stub();
                responseStub.body = sandbox.stub();
                let promiseStub = sandbox.stub();
                let doValidateSwaggerSchemaStub =
                    sandbox.stub(sts, 'doValidateSwaggerSchema').returns(promiseStub);

                let promise = sts.doValidate(exampleStub, responseStub);

                expect(chaiStub.expect).to.have.been.calledWithExactly(responseStub);
                expect(chaiStub.containSubset).to.have.been.calledWithExactly(exampleStub.response);
                expect(doValidateSwaggerSchemaStub).to.have.been.calledWithExactly(
                    exampleStub.specResponseSchema['$ref'], responseStub.body);
                expect(promise).to.equals(promiseStub);
            });
        });

        it('should dispatch auth from response', function () {
            sts.spec.securityDefinitions = {
                strategy2: {},
                strategy3: {}
            };
            let exampleStrategiesMock = {
                strategy1: {},
                strategy2: {},
                strategy3: {
                    'x-ample': '[${headers.header1}:${body.field2}]'
                }
            };
            let responseMock = {
                headers: {
                    header1: 'value1'
                },
                body: {
                    field2: 'value2'
                }
            };

            sts.dispatchAuth(exampleStrategiesMock, responseMock);

            expect(sts.spec.securityDefinitions).to.eql({
                strategy2: {},
                strategy3: {
                    'x-ample': '[value1:value2]'
                }
            });
        });

        describe('validate swagger schema', function () {
            let refStub,
                bodyStub;

            beforeEach(function () {
                swaggerToolsStub.specs = swaggerToolsStub;
                swaggerToolsStub.v2 = swaggerToolsStub;
                swaggerToolsStub.validateModel = sandbox.stub();

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