'use strict';

let chai = require('chai');
let expect = chai.expect;
let sinon = require('sinon');
let chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
let sinonChai = require('sinon-chai');
chai.use(sinonChai);
let proxyquire = require('proxyquire');

describe('STSSchemaValidator module', function() {
    let sandbox = sinon.sandbox.create();
    let swaggerToolsStub,
        specStub,
        STSSchemaValidator,
        schemaValidator;

    beforeEach(function () {
        swaggerToolsStub = sandbox.stub();

        specStub = sandbox.stub();

        STSSchemaValidator = proxyquire('../../lib/STSSchemaValidator', {
            'swagger-tools': swaggerToolsStub
        });
        schemaValidator = new STSSchemaValidator(specStub);
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should construct STSSchemaValidator', function () {
        expect(schemaValidator.spec).to.equals(specStub);
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
                schemaValidator.spec, refStub, bodyStub, sinon.match.func);
        };

        it('should validate', function () {
            swaggerToolsStub.validateModel.callsArg(3);

            let promise = schemaValidator.validate(refStub, bodyStub);

            commonTest(promise);

            return expect(promise).to.be.fulfilled;
        });

        it('should fail', function () {
            let errorMock = new Error('test error');
            swaggerToolsStub.validateModel.callsArgWith(3, errorMock);

            let promise = schemaValidator.validate(refStub, bodyStub);

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

            let promise = schemaValidator.validate(refStub, bodyStub);

            commonTest(promise);

            return expect(promise).to.be.rejectedWith(Error, 'Validation failed:\n' +
                '#/1/2: 3\n' +
                '#/4/5: 6');
        });
    });
});