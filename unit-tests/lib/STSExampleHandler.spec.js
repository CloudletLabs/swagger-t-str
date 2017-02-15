'use strict';

let chai = require('chai');
let expect = chai.expect;
let sinon = require('sinon');
let sinonChai = require('sinon-chai');
chai.use(sinonChai);
let proxyquire = require('proxyquire');

describe('STSExampleHandler module', function() {
    let sandbox = sinon.sandbox.create();
    let preqStub,
        chaiStub,
        chaiSubsetStub,
        specStub,
        schemaValidatorMock,
        specPathStub,
        specMethodStub,
        specCodeStub,
        exampleMock,
        STSExampleHandler,
        exampleHandler;

    beforeEach(function () {
        preqStub = sandbox.stub();

        chaiStub = sandbox.stub();
        chaiStub.use = sandbox.stub();
        chaiSubsetStub = sandbox.stub();

        specStub = sandbox.stub();

        schemaValidatorMock = function (spec) {
            this.spec = spec;
        };

        exampleMock = {
            specPath: sandbox.stub(),
            specMethod: sandbox.stub(),
            specCode: sandbox.stub()
        };
        specStub.paths = sandbox.stub();
        specPathStub = specStub.paths[exampleMock.specPath] = sandbox.stub();
        specMethodStub = specStub.paths[exampleMock.specPath][exampleMock.specMethod] = sandbox.stub();
        specStub.paths[exampleMock.specPath][exampleMock.specMethod].responses = sandbox.stub();
        specCodeStub =
            specStub.paths[exampleMock.specPath][exampleMock.specMethod].responses[exampleMock.specCode] =
                sandbox.stub();

        STSExampleHandler = proxyquire('../../lib/STSExampleHandler', {
            'preq': preqStub,
            'chai': chaiStub,
            'chai-subset': chaiSubsetStub,
            './STSSchemaValidator': schemaValidatorMock
        });
        exampleHandler = new STSExampleHandler(specStub);
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should configure chai', function () {
        expect(chaiStub.use).to.have.been.calledWithExactly(chaiSubsetStub);
    });

    it('should construct STSExampleHandler', function () {
        expect(exampleHandler.spec).to.equals(specStub);
        expect(exampleHandler.schemaValidator.spec).to.equals(specStub);
    });

    it('should handle given example', function () {
        let exampleStub = sandbox.stub();
        exampleStub.request = sandbox.stub();
        exampleStub.request.method = sandbox.stub();
        let substituteUrlParametersStub = sandbox.stub(exampleHandler, 'substituteUrlParameters');
        let addAuthStub = sandbox.stub(exampleHandler, 'addAuth');
        let validatorStub = sandbox.stub(exampleHandler, 'getValidator');
        validatorStub.returns(validatorStub);
        preqStub[exampleStub.request.method] = sandbox.stub().returns(preqStub);
        preqStub.then = sandbox.stub().returns(preqStub);

        exampleHandler.handle(exampleStub);

        expect(substituteUrlParametersStub).to.have.been.calledWithExactly(exampleStub);
        expect(addAuthStub).to.have.been.calledWithExactly(exampleStub);
        expect(validatorStub).to.have.been.calledWithExactly(exampleStub);
        expect(preqStub[exampleStub.request.method]).to.have.been.calledWithExactly(exampleStub.request);
        expect(preqStub.then).to.have.been.calledWithExactly(validatorStub, validatorStub);
    });

    describe('substitute parameters in url', function () {
        beforeEach(function () {
            exampleMock.request = {};
        });

        it ('should do nothing on null spec parameters', function () {
            exampleHandler.substituteUrlParameters(exampleMock);
        });

        it ('should do nothing on null request parameters', function () {
            specMethodStub.parameters = [];
            exampleHandler.substituteUrlParameters(exampleMock);
        });

        it ('should do nothing on empty spec parameters', function () {
            specMethodStub.parameters = [];
            exampleMock.request.parameters = {};
            exampleHandler.substituteUrlParameters(exampleMock);
        });

        it ('should do nothing on fake `in` parameter', function () {
            specMethodStub.parameters = [ { in: 'fake' } ];
            exampleMock.request.parameters = {};
            exampleHandler.substituteUrlParameters(exampleMock);
        });

        it ('should do nothing on missing path parameter in request', function () {
            specMethodStub.parameters = [ { in: 'path', name: 'fake' } ];
            exampleMock.request.parameters = {};
            exampleHandler.substituteUrlParameters(exampleMock);
        });

        it ('should substitute', function () {
            specMethodStub.parameters = [
                {
                    in: 'path',
                    name: 'param1'
                },
                {
                    in: 'path',
                    name: 'param2'
                }
            ];
            exampleMock.request.uri = 'http://localhost/foo/{param1}/{param2}';
            exampleMock.request.parameters = {
                param1: 'bar',
                param2: 'baz'
            };

            exampleHandler.substituteUrlParameters(exampleMock);

            expect(exampleMock.request.uri).to.eql('http://localhost/foo/bar/baz');
            expect(exampleMock.request.parameters).not.to.have.property('param1');
            expect(exampleMock.request.parameters).not.to.have.property('param2');
        });
    });

    describe('add auth', function () {
        beforeEach(function () {
            exampleMock.request = {};
        });

        it('should do nothing when not example.auth', function () {
            exampleHandler.addAuth(exampleMock);
            exampleMock.auth = false;
            exampleHandler.addAuth(exampleMock);
        });

        it('should do nothing when x-ample not defined', function () {
            exampleHandler.spec.securityDefinitions = {
                Test: {}
            };
            exampleMock.auth = true;
            specMethodStub.security = [
                {
                    Test: []
                }
            ];

            exampleHandler.addAuth(exampleMock);
        });

        it('should do nothing when non-basic non-header', function () {
            exampleHandler.spec.securityDefinitions = {
                Test: {
                    type: 'foo',
                    in: 'bar',
                    'x-ample': 'baz'
                }
            };
            exampleMock.auth = true;
            specMethodStub.security = [
                {
                    Test: []
                }
            ];

            exampleHandler.addAuth(exampleMock);
        });

        it('should add basic auth', function () {
            exampleHandler.spec.securityDefinitions = {
                Basic: {
                    type: 'basic',
                    'x-ample': 'test basic'
                }
            };
            exampleMock.auth = true;
            exampleMock.request = {
                headers: {}
            };
            specMethodStub.security = [
                {
                    Basic: []
                }
            ];

            exampleHandler.addAuth(exampleMock);

            expect(exampleMock.request.headers).to.eql({ Authorization: 'test basic' });
        });

        it('should add token auth', function () {
            exampleHandler.spec.securityDefinitions = {
                Basic: {
                    type: 'foo',
                    in: 'header',
                    name: 'Bar',
                    'x-ample': 'test foo bar'
                }
            };
            exampleMock.auth = true;
            exampleMock.request = {
                headers: {}
            };
            specMethodStub.security = [
                {
                    Basic: []
                }
            ];

            exampleHandler.addAuth(exampleMock);

            expect(exampleMock.request.headers).to.eql({ Bar: 'test foo bar' });
        });
    });

    it('should get validator', function () {
        let exampleStub = sandbox.stub();
        let validator = exampleHandler.getValidator(exampleStub);
        expect(validator).to.be.a('function');

        let respStub = sandbox.stub();
        let promiseStub = sandbox.stub();
        let doValidateStub = sandbox.stub(exampleHandler, 'doValidate').returns(promiseStub);
        let promise = validator(respStub);
        expect(promise).to.equals(promiseStub);
        expect(doValidateStub).to.have.been.calledWithExactly(exampleStub, respStub);
    });

    describe('validating response', function () {
        let responseStub;

        beforeEach(function () {
            exampleMock.response = sandbox.stub();
            responseStub = sandbox.stub();

            chaiStub.expect = sandbox.stub().returns(chaiStub);
            chaiStub.to = chaiStub;
            chaiStub.containSubset = sandbox.stub().returns(chaiStub);
        });

        let commonTest = function (promise) {
            expect(promise).to.be.undefined;
            expect(chaiStub.expect).to.have.been.calledWithExactly(responseStub);
            expect(chaiStub.containSubset).to.have.been.calledWithExactly(exampleMock.response);
        };

        it('should validate', function () {
            commonTest(exampleHandler.doValidate(exampleMock, responseStub));
        });

        it('should validate with authProviderFor', function () {
            exampleMock.authProviderFor = sandbox.stub();
            let dispatchAuthStub = sandbox.stub(exampleHandler, 'dispatchAuth');

            commonTest(exampleHandler.doValidate(exampleMock, responseStub));
            expect(dispatchAuthStub).to.have.been.calledWithExactly(exampleMock.authProviderFor, responseStub);
        });

        it('should validate with no $ref', function () {
            specCodeStub.schema = sandbox.stub();
            commonTest(exampleHandler.doValidate(exampleMock, responseStub));
        });

        it('should validate with no body', function () {
            specCodeStub.schema = sandbox.stub();
            specCodeStub.schema['$ref'] = sandbox.stub();
            commonTest(exampleHandler.doValidate(exampleMock, responseStub));
        });

        it('should validate with schema', function () {
            specCodeStub.schema = sandbox.stub();
            specCodeStub.schema['$ref'] = sandbox.stub();
            responseStub.body = sandbox.stub();
            let promiseStub = sandbox.stub();
            schemaValidatorMock.prototype.validate = sandbox.stub().returns(promiseStub);

            let promise = exampleHandler.doValidate(exampleMock, responseStub);

            expect(chaiStub.expect).to.have.been.calledWithExactly(responseStub);
            expect(chaiStub.containSubset).to.have.been.calledWithExactly(exampleMock.response);
            expect(schemaValidatorMock.prototype.validate).to.have.been.calledWithExactly(
                specCodeStub.schema['$ref'], responseStub.body);
            expect(promise).to.equals(promiseStub);
        });
    });

    it('should dispatch auth from response', function () {
        exampleHandler.spec.securityDefinitions = {
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

        exampleHandler.dispatchAuth(exampleStrategiesMock, responseMock);

        expect(exampleHandler.spec.securityDefinitions).to.eql({
            strategy2: {},
            strategy3: {
                'x-ample': '[value1:value2]'
            }
        });
    });
});