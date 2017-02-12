'use strict';

let sinon = require('sinon');
let chai = require('chai');
let sinonChai = require('sinon-chai');
let expect = chai.expect;
chai.use(sinonChai);
let proxyquire = require('proxyquire');

describe('The index module', function() {
    let sandbox = sinon.sandbox.create();

    afterEach(function () {
        sandbox.restore();
    });

    it('should return swagger-t-str lib', function () {
        let libStub = sandbox.stub();
        let index = proxyquire('../', { './lib/swagger-t-str': libStub });
        expect(index).to.be.equals(libStub);
    });
});