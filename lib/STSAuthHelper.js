let SwaggerClient = require('swagger-client');

let self = {
    /**
     * Add given example to clientAuthorizations as a given name
     * @param client
     * @param clientAuthorizations
     * @param name
     * @param example
     */
    add: function (client, clientAuthorizations, name, example) {
        let securityDefinitions = client.securityDefinitions;
        if (!example || !securityDefinitions || !securityDefinitions[name]) return;
        let securityDefinition = securityDefinitions[name];
        if (securityDefinition.type == 'basic' && example.username && example.password) {
            clientAuthorizations[name] =
                new SwaggerClient.PasswordAuthorization(example.username, example.password);
        } else if (securityDefinition.type == 'basic') {
            clientAuthorizations[name] =
                new SwaggerClient.ApiKeyAuthorization('Authorization', example, 'header');
        } else if (securityDefinition.type == 'apiKey') {
            clientAuthorizations[name] =
                new SwaggerClient.ApiKeyAuthorization(securityDefinition.name, example, securityDefinition.in);
        } else if (securityDefinition.type == 'oauth2') {
            clientAuthorizations[name] =
                new SwaggerClient.CookieAuthorization(example);
        }
    },
    /**
     * Parse client.securityDefinitions for an `x-ample` fields
     * @param client
     * @returns {{}}
     */
    parse: function (client) {
        let securityDefinitions = client.securityDefinitions;
        let clientAuthorizations = {};
        if (!securityDefinitions) return clientAuthorizations;
        for (let securityDefinitionName of Object.keys(securityDefinitions)) {
            self.add(client, clientAuthorizations, securityDefinitionName,
                securityDefinitions[securityDefinitionName]['x-ample']);
        }
        return clientAuthorizations;
    }
};
module.exports = self;