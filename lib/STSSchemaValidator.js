'use strict';

let swaggerTools = require('swagger-tools');

module.exports = STSSchemaValidator;

function STSSchemaValidator(spec) {
    this.spec = spec;
}

STSSchemaValidator.prototype.validate = function (ref, body) {
    let self = this;
    return new Promise(function (resolve, reject) {
        swaggerTools.specs.v2.validateModel(self.spec, ref, body, function (err, result) {
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
