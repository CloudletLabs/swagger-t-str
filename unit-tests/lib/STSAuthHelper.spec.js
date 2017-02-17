'use strict';

let sinon = require('sinon');
let chai = require('chai');
let expect = chai.expect;
let sinonChai = require('sinon-chai');
chai.use(sinonChai);
let proxyquire = require('proxyquire');


describe('STSAuthHelper module', function() {
    //noinspection JSUnresolvedVariable
    let sandbox = sinon.sandbox.create();

    let SwaggerClientStub,
        authHelper;

    beforeEach(function () {
        SwaggerClientStub = sandbox.stub();
        authHelper = proxyquire('../../lib/STSAuthHelper', {
            'swagger-client': SwaggerClientStub
        });
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should have functions', function () {
        expect(Object.keys(authHelper).length).to.equals(2);
        expect(authHelper.add).to.be.a('function');
        expect(authHelper.parse).to.be.a('function');
    });

    describe('adding', function () {
        let clientStub,
            clientAuthorizationsStub,
            nameStub,
            exampleStub,
            securityDefinitionMock;

        beforeEach(function () {
            clientStub = sandbox.stub();
            clientStub.securityDefinitions = sandbox.stub();
            clientAuthorizationsStub = sandbox.stub();
            nameStub = sandbox.stub();
            exampleStub = sandbox.stub();

            securityDefinitionMock = clientStub.securityDefinitions[nameStub] = {};
        });

        it ('should do nothing on null example', function () {
            authHelper.add(clientStub, clientAuthorizationsStub, nameStub, null);
        });

        it ('should do nothing on null securityDefinitions', function () {
            authHelper.add({}, clientAuthorizationsStub, nameStub, exampleStub);
        });

        it ('should do nothing on missing given securityDefinition', function () {
            authHelper.add({ securityDefinitions: {} }, clientAuthorizationsStub, nameStub, exampleStub);
        });

        it ('should do nothing on unknown auth type', function () {
            securityDefinitionMock.type = 'foo';
            authHelper.add(clientStub, clientAuthorizationsStub, nameStub, exampleStub);
        });

        it ('should add basic auth', function () {
            securityDefinitionMock.type = 'basic';
            exampleStub.username = sandbox.stub();
            exampleStub.password = sandbox.stub();
            let passwordAuthorizationSpy = sandbox.spy();
            SwaggerClientStub.PasswordAuthorization = function () {
                //noinspection JSCheckFunctionSignatures
                passwordAuthorizationSpy.apply(this, arguments);
            };

            authHelper.add(clientStub, clientAuthorizationsStub, nameStub, exampleStub);
            expect(clientAuthorizationsStub[nameStub]).to.be.an.instanceof(SwaggerClientStub.PasswordAuthorization);
            expect(passwordAuthorizationSpy).to.calledWithExactly(exampleStub.username, exampleStub.password);
        });

        it ('should add basic auth with plain header', function () {
            securityDefinitionMock.type = 'basic';
            exampleStub = sandbox.stub();
            let apiKeyAuthorizationSpy = sandbox.spy();
            SwaggerClientStub.ApiKeyAuthorization = function () {
                //noinspection JSCheckFunctionSignatures
                apiKeyAuthorizationSpy.apply(this, arguments);
            };

            authHelper.add(clientStub, clientAuthorizationsStub, nameStub, exampleStub);
            expect(clientAuthorizationsStub[nameStub]).to.be.an.instanceof(SwaggerClientStub.ApiKeyAuthorization);
            expect(apiKeyAuthorizationSpy).to.calledWithExactly('Authorization', exampleStub, 'header');
        });

        it ('should add api key auth', function () {
            securityDefinitionMock.type = 'apiKey';
            securityDefinitionMock.name = sandbox.stub();
            securityDefinitionMock.in = sandbox.stub();
            exampleStub = sandbox.stub();
            let apiKeyAuthorizationSpy = sandbox.spy();
            SwaggerClientStub.ApiKeyAuthorization = function () {
                //noinspection JSCheckFunctionSignatures
                apiKeyAuthorizationSpy.apply(this, arguments);
            };

            authHelper.add(clientStub, clientAuthorizationsStub, nameStub, exampleStub);
            expect(clientAuthorizationsStub[nameStub]).to.be.an.instanceof(SwaggerClientStub.ApiKeyAuthorization);
            expect(apiKeyAuthorizationSpy).to.calledWithExactly(
                securityDefinitionMock.name, exampleStub, securityDefinitionMock.in);
        });

        it ('should add cookies auth', function () {
            securityDefinitionMock.type = 'oauth2';
            exampleStub = sandbox.stub();
            let cookieAuthorizationSpy = sandbox.spy();
            SwaggerClientStub.CookieAuthorization = function () {
                //noinspection JSCheckFunctionSignatures
                cookieAuthorizationSpy.apply(this, arguments);
            };

            authHelper.add(clientStub, clientAuthorizationsStub, nameStub, exampleStub);
            expect(clientAuthorizationsStub[nameStub]).to.be.an.instanceof(SwaggerClientStub.CookieAuthorization);
            expect(cookieAuthorizationSpy).to.calledWithExactly(exampleStub);
        });
    });

    describe('parsing', function () {
        let clientStub;

        beforeEach(function () {
            clientStub = sandbox.stub();
        });

        it('should do nothing if no securityDefinitions', function () {
            expect(authHelper.parse(clientStub)).to.eql({});
        });

        it('should parse x-ample from each securityDefinitions', function () {
            let exampleFooStub = sandbox.stub();
            let exampleBarStub = sandbox.stub();
            clientStub.securityDefinitions = {
                foo: {
                    'x-ample': exampleFooStub
                },
                bar: {
                    'x-ample': exampleBarStub
                }
            };
            let addStub = sandbox.stub(authHelper, 'add');

            let clientAuthorizations = authHelper.parse(clientStub);

            expect(addStub).to.calledTwice;
            expect(addStub).to.calledWithExactly(clientStub, clientAuthorizations, 'foo', exampleFooStub);
            expect(addStub).to.calledWithExactly(clientStub, clientAuthorizations, 'bar', exampleBarStub);
        });
    });
});