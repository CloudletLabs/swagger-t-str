'use strict';

let sinon = require('sinon');
let chai = require('chai');
let expect = chai.expect;
let sinonChai = require('sinon-chai');
chai.use(sinonChai);
let proxyquire = require('proxyquire');

describe('STSExampleHandler module', function() {
    //noinspection JSUnresolvedVariable
    let sandbox = sinon.sandbox.create();
    let chaiStub,
        chaiSubsetStub,
        specStub,
        clientStub,
        authHelper,
        schemaValidatorSpy,
        schemaValidatorMock,
        STSExampleHandler,
        exampleHandler;

    beforeEach(function () {
        chaiStub = sandbox.stub();
        chaiStub.use = sandbox.stub();
        chaiSubsetStub = sandbox.stub();

        specStub = sandbox.stub();
        clientStub = sandbox.stub();

        authHelper = sandbox.stub();
        authHelper.parse = sandbox.stub().returns(authHelper);

        schemaValidatorSpy = sandbox.spy();
        schemaValidatorMock = function () {
            //noinspection JSCheckFunctionSignatures
            schemaValidatorSpy.apply(this, arguments);
        };

        STSExampleHandler = proxyquire('../../lib/STSExampleHandler', {
            'chai': chaiStub,
            'chai-subset': chaiSubsetStub,
            './STSAuthHelper': authHelper,
            './STSSchemaValidator': schemaValidatorMock
        });
        exampleHandler = new STSExampleHandler(specStub, clientStub);
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should configure chai', function () {
        expect(chaiStub.use).to.calledWithExactly(chaiSubsetStub);
    });

    it('should construct STSExampleHandler', function () {
        expect(exampleHandler.client).to.equals(clientStub);
        expect(authHelper.parse).to.calledWithExactly(clientStub);
        expect(exampleHandler.clientAuthorizations).to.equals(authHelper);
        expect(schemaValidatorSpy).to.calledWithExactly(specStub);
        expect(exampleHandler.schemaValidator).to.be.an.instanceof(schemaValidatorMock);
    });

    describe('handling example', function () {

        it('should handle example with auth', function () {
            let operationStub = sandbox.stub();
            operationStub.nickname = 'foo';
            let exampleStub = sandbox.stub();
            let responseCodeStub = sandbox.stub();
            let normalizedExampleStub = sandbox.stub();
            let normalizeExampleStub = sandbox.stub(exampleHandler, 'normalizeExample').returns(normalizedExampleStub);
            let validatorStub = sandbox.stub();
            let getValidatorStub = sandbox.stub(exampleHandler, 'getValidator').returns(validatorStub);
            let requestStub = sandbox.stub();
            let buildRequestStub = sandbox.stub(exampleHandler, 'buildRequest').returns(requestStub);
            let clientAuthorizationsStub = sandbox.stub();
            let getAuthorizationsStub =
                sandbox.stub(exampleHandler, 'getAuthorizations').returns(clientAuthorizationsStub);
            let promiseStub = sandbox.stub();
            promiseStub.then = sandbox.stub();
            exampleHandler.client = {
                default: {
                    foo: sandbox.stub().returns(promiseStub)
                }
            };

            exampleHandler.handle(operationStub, responseCodeStub, exampleStub);

            expect(normalizeExampleStub).to.calledWithExactly(responseCodeStub, exampleStub);
            expect(getValidatorStub).to.calledWithExactly(operationStub, responseCodeStub, normalizedExampleStub);
            expect(buildRequestStub).to.calledWithExactly(operationStub, normalizedExampleStub);
            expect(getAuthorizationsStub).to.calledWithExactly(normalizedExampleStub);
            expect(promiseStub.then).to.calledWithExactly(validatorStub, validatorStub);
            expect(exampleHandler.client.default.foo).to.calledWithExactly(requestStub,
                { clientAuthorizations: clientAuthorizationsStub });
        });
    });

    describe('example normalization', function () {
        let exampleMock;

        beforeEach(function () {
            exampleMock = {};
        });

        it('should normalize empty example', function () {
            let normalized = exampleHandler.normalizeExample('200', exampleMock);
            expect(normalized).not.equals(exampleMock);
            expect(normalized).to.eql({
                request: {
                    headers: {},
                    parameters: {}
                },
                response: {
                    status: 200
                }
            });
        });

        it('should normalize example', function () {
            exampleMock = {
                foo: {},
                request: {
                    headers: {
                        bar: {}
                    },
                    parameters: {
                        baz: {}
                    }
                },
                response: {
                    status: 300,
                    abc: {}
                }
            };
            let normalized = exampleHandler.normalizeExample('200', exampleMock);
            expect(normalized).not.equals(exampleMock);
            expect(normalized).to.eql(exampleMock);
        });
    });

    it('should get validator', function () {
        let operationStub = sandbox.stub();
        let responseCodeStub = sandbox.stub();
        let exampleStub = sandbox.stub();

        let validator = exampleHandler.getValidator(operationStub, responseCodeStub, exampleStub);
        expect(validator).to.be.a('function');

        let respStub = sandbox.stub();
        let promiseStub = sandbox.stub();
        let doValidateStub = sandbox.stub(exampleHandler, 'doValidate').returns(promiseStub);
        let promise = validator(respStub);
        expect(promise).to.equals(promiseStub);
        expect(doValidateStub).to.calledWithExactly(operationStub, responseCodeStub, exampleStub, respStub);
    });

    it('should build request', function () {
        let operationStub = sandbox.stub();
        let exampleMock = {
            request: {
                headers: {
                    foo2: 'hed',
                    foo3: 'hed',
                    body: 'hed'
                },
                parameters: {
                    foo3: 'param',
                    body: 'param'
                },
                body: 'body'
            }
        };
        let requestMock = {
            foo1: 'req',
            foo2: 'req',
            foo3: 'req',
            body: 'req'
        };
        let buildDefaultRequestStub = sandbox.stub(exampleHandler, 'buildDefaultRequest').returns(requestMock);

        let request = exampleHandler.buildRequest(operationStub, exampleMock);
        expect(buildDefaultRequestStub).to.calledWithExactly(operationStub);
        expect(request).to.eql({
            foo1: 'req',
            foo2: 'hed',
            foo3: 'param',
            body: 'body'
        });
    });
    
    describe('building default request', function () {
        it('should build request for empty parameters', function () {
            expect(exampleHandler.buildDefaultRequest({})).to.eql({});
        });

        it('should build request for given parameters', function () {
            let operationMock = {
                parameters: [
                    {
                        name: 'foo'
                    },
                    {
                        name: 'bar',
                        'x-ample': 'example'
                    }
                ]
            };

            expect(exampleHandler.buildDefaultRequest(operationMock)).to.eql({
                bar: 'example'
            });
        });
    });

    describe('getting authorizations', function () {
        it('should do nothing when not example.auth', function () {
            exampleHandler.getAuthorizations({});
        });

        it('should return existing clientAuthorizations if not an object', function () {
            expect(exampleHandler.getAuthorizations({ auth: true })).to.equals(authHelper);
        });

        it('should return additional clientAuthorizations if an object', function () {
            let clonedClientAuthorizationsStub = sandbox.stub();
            let assignStub = sandbox.stub(Object, 'assign').returns(clonedClientAuthorizationsStub);
            let addStub = sandbox.stub(authHelper, 'add');
            let exampleMock = {
                auth: {
                    foo: 'bar',
                    qwe: 'abc'
                }
            };

            let clientAuthorizations = exampleHandler.getAuthorizations(exampleMock);

            expect(assignStub).to.calledWithExactly({}, authHelper);
            expect(clientAuthorizations).equals(clonedClientAuthorizationsStub);
            expect(addStub).to.calledTwice;
            expect(addStub).to.calledWithExactly(exampleHandler.client, clonedClientAuthorizationsStub, 'foo', 'bar');
            expect(addStub).to.calledWithExactly(exampleHandler.client, clonedClientAuthorizationsStub, 'qwe', 'abc');
        });
    });

    it('should validate response', function () {
        let operationStub = sandbox.stub();
        let responseCodeStub = sandbox.stub();
        let exampleStub = sandbox.stub();
        exampleStub.response = sandbox.stub();
        let responseStub = sandbox.stub();
        chaiStub.expect = sandbox.stub().returns(chaiStub);
        chaiStub.to = chaiStub;
        chaiStub.containSubset = sandbox.stub().returns(chaiStub);
        let dispatchAuthStub = sandbox.stub(exampleHandler, 'dispatchAuth');
        let promiseStub = sandbox.stub();
        schemaValidatorMock.prototype.validate = sandbox.stub().returns(promiseStub);

        let promise = exampleHandler.doValidate(operationStub, responseCodeStub, exampleStub, responseStub);

        expect(chaiStub.expect).to.calledWithExactly(responseStub);
        expect(chaiStub.containSubset).to.calledWithExactly(exampleStub.response);
        expect(dispatchAuthStub).to.calledWithExactly(exampleStub, responseStub);
        expect(schemaValidatorMock.prototype.validate).to.calledWithExactly(
            operationStub, responseCodeStub, responseStub);
        expect(promise).to.equals(promiseStub);
    });

    describe('dispatching auth from response', function () {
        it('should do nothing on empty authProviderFor', function () {
            exampleHandler.dispatchAuth({});
        });

        it('should dispatch auth from response', function () {
            exampleHandler.client = sandbox.stub();
            exampleHandler.client.securityDefinitions = {
                strategy2: {},
                strategy3: {}
            };
            let example = {
                authProviderFor: {
                    strategy1: {},
                    strategy2: {},
                    strategy3: {
                        'x-ample': '[${headers.header1}:${obj.field2}]'
                    }
                }
            };
            let responseMock = {
                headers: {
                    header1: 'value1'
                },
                obj: {
                    field2: 'value2'
                }
            };
            exampleHandler.clientAuthorizations = sandbox.stub();
            authHelper.add = sandbox.stub();

            exampleHandler.dispatchAuth(example, responseMock);

            expect(authHelper.add).to.calledOnce;
            expect(authHelper.add).to.calledWithExactly(exampleHandler.client, exampleHandler.clientAuthorizations,
                'strategy3', '[value1:value2]'
            );
        });
    });
});