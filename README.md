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

Actual response will be compared to the sample provided in `x-amples`
 using [chai-subset](https://www.npmjs.com/package/chai-subset).
That means if server returns some extra-fields they are silently ignored.

In case of current endpoint provided with schema (see `/info` in the example below),
 response body will be validated against it using [swagger-tools](https://www.npmjs.com/package/swagger-tools).

```yaml
definitions:
  infoo:
    properties:
      version:
        type: string
    required:
      - version
    type: object

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
          schema:
            $ref: '#/definitions/infoo'
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

There is only `Basic` and headers-based auth types currently supported.

The idea is to add `x-ample` to your `securityDefinitions`,
 so that it will be possible to find it automatically based on method `security` definition.
You need to enable `auth: true` for your example,
 so if it is not explicitly enabled, we will get a test failure.

Sometimes it is handy to save auth data from specific response and use it for other requests.
For instance, we have `POST /auth_token` endpoint with `Basic` auth,
 that is returns simple JSON `{"auth_token":"abc"}`. And we want to use this token later for other requests.
To achieve that you can use `authProviderFor` in a given example,
 that will define an `x-ample` for a given `securityDefinitions`.
There is `body` and `headers` available in the context of `x-ample` string.
In the example below you can find how to achieve this:

```yaml
securityDefinitions:
  Basic:
    type: basic
    description: Password auth
    x-ample: Basic qwe # set `Authorization` header value
  Bearer: # no `x-ample` provided - will be set in runtime by provider
    type: apiKey
    description: Token auth
    in: header
    name: Authorization

paths:
  /auth_token:
    post:
      description: Get auth token for username+password pair
      security:
        - Basic: []
      responses:
        '200':
          description: OK
          x-amples:
            - description: should return auth token
              auth: true # here is we enabling auth for this specific sample
              authProviderFor: # define this sample to be a provider for the given auth definitions
                Bearer:
                  x-ample: 'Bearer ${body.auth_token}' # define how resulting auth example should looks like
              response:
                body:
                  auth_token: 'abc'
        '401': # no auth set to true (because in fact no x-amples defined) - will not set headers
          description: Unauthorized
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
              auth: true # we still need to tell that we want this example to be authenticated
              response:
                body: []
        '401':
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