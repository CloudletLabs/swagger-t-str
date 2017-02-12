# swagger-t-str

Swagger Specification-Driven test framework

[![Build Status](https://travis-ci.org/CloudletLabs/swagger-t-str.svg?branch=master)](https://travis-ci.org/CloudletLabs/swagger-t-str)

# Usage

```

  Usage: swagger-t-str [options]

  Options:

    -h, --help                 output usage information
    -V, --version              output the version number
    -p, --protocol [protocol]  protocol [http, https], default http
    -h, --host [host]          API host, default localhost
    -P, --port [port]          API port, default 8081
    -s, --spec [path]          json/yaml swagger file path, default ./swagger.yml

```

You can see Swagger file samples in [`integration-tests`](integration-tests) folder.

For each request you can add a list of `x-amples`,
 specifying set of different request attributes and corresponding response for each.

If no `x-amples` provided,
 endpoint will be tested against given HTTP method with empty request object and only response code will be validated.

```yaml
paths:
  /status:
    get:
      description: Get service status
      produces:
        - text/html
      responses:
        '200':
          description: OK
  /info:
    get:
      description: Get service info
      responses:
        '200':
          description: OK
          x-amples:
            - description: should return info object
              response:
                body:
                  version: '1.1'
```

Output:

```spec
  http://localhost:8081/api
    /status
      GET
        200
          ✓ GET 200: should return HTTP status code
    /info
      GET
        200
          ✓ GET 200: should return info object
```

# Auth

There is only 'Basic' and headers-based auth types currently supported.

The idea is to add `x-ample` to your `securityDefinitions`,
 so that it will be possible to find it automatically based on method `security` definition.
Additionally you need to specifically enable `auth: true` for your example,
 so if it is not explicitly enabled, we will get a test failure.
In the example below see how to use `Bearer` auth:

```yaml
securityDefinitions:
  Bearer:
    type: apiKey
    description: Token auth
    in: header
    name: Authorization
    x-ample: Bearer abc

paths:
  '/users':
    get:
      description: Get users
      security:
        - Bearer: []
      responses:
        '200':
          description: List of users
          x-amples:
            - description: should return the list of users
              auth: true # here is we enabling auth only for this specific sample
              response:
                body: []
        '401': # no auth set to true (because in fact no x-amples defined) - will not set headers
          description: Unauthorized
```

# Parameterized URL

It is supported an automatic URL parameters substitution from `x-amples` list of parameters.

In the example below it is demonstrated how to perform a `GET` request to `/users/admin`

```yaml
paths:
  '/users/{username}':
    get:
      description: Get user
      parameters:
        - description: User name
          in: path
          name: username
          required: true
          type: string
      responses:
        '200':
          description: OK
          x-amples:
            - description: should delete auth token
              request:
                parameters:
                  username: admin
```

# Programmatically

```js
'use strict';

let STS = require('swagger-t-str');

let options = {
    protocol: 'http',
    host: 'localhost',
    port: '8081',
    spec: './swagger.yml'
};
let sts = new STS(options);
sts.start(function(failures){
    console.log(failures);
});
```