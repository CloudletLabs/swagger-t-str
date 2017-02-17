'use strict';

let swaggerTools = require('swagger-tools');

module.exports = STSSchemaValidator;

function STSSchemaValidator(spec) {
    this.spec = spec;
}

STSSchemaValidator.prototype.validate = function (operation, responseCode, response) {
    let specResponseSchema = this.spec.paths[operation.path][operation.method].responses[responseCode].schema;
    if (specResponseSchema && specResponseSchema['$ref'] && response && response.obj) {
        return this.getValidator(specResponseSchema['$ref'], response.obj);
    }
};

STSSchemaValidator.prototype.getValidator = function (ref, obj) {
    let self = this;
    return new Promise(function (resolve, reject) {
        //noinspection JSCheckFunctionSignatures
        swaggerTools.specs.v2.validateModel(self.spec, ref, obj,
            function (err, result) {
                if (err) return reject(err);
                if (result) {
                    let messages = result.errors.map(function (err) {
                        return '#/' + err.path.join('/') + ': ' + err.message;
                    });
                    return reject(new Error('Validation failed:\n' + messages.join('\n')));
                }
                resolve();
            });
    });
};