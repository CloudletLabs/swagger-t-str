# swagger-t-str

Swagger Specification-Driven test framework

[![Build Status](https://travis-ci.org/CloudletLabs/swagger-t-str.svg?branch=master)](https://travis-ci.org/CloudletLabs/swagger-t-str)

# Usage

```

  Usage: swagger-t-str [options]

  Options:

    -h, --help         output usage information
    -V, --version      output the version number
    -u, --url [URL]    API URL, default http://localhost:8081
    -s, --spec [path]  json/yaml swagger file path, default ./swagger.yml

```

Please find Swagger file examples in [`integration-tests`](integration-tests) folder.

For each response in the spec file you can add a list of `x-amples`,
 specifying set of different request attributes and corresponding response attributes for each.

If no `x-amples` provided,
 endpoint will be tested against given HTTP method with default request object and only response code will be validated.

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
                obj:
                  version: '1.1'
```

Output:

```spec
  http://localhost:8081: my test API
    GET /status
      ✓ 200: should return expected HTTP status code
    GET /info
      ✓ 200: should return info object
```

# Building requests

For pretty much everything it is [swagger-client](https://www.npmjs.com/package/swagger-client) used under the hood.
To understand how we building a suites and requests,
 first let's take a look at the example from `swagger-client` README:

```js
var Swagger = require('swagger-client');
 
var client = new Swagger({
  url: 'http://petstore.swagger.io/v2/swagger.json',
  success: function() {
    client.pet.getPetById({petId:7},function(pet){
      console.log('pet', pet);
    });
  }
});
```

To build a suite, we are finding all operations like `getPetById` in the spec file
 (operations execution order will be the same as in the spec file).
Then, for each operation we are building an option object like `{petId:7}` in the following way:

1. Getting `parameters` from paths and methods and looking for it's `x-ample` value
1. Overriding result from previous step using current `x-amples` instance `request.headers`
1. Overriding in the result from previous step it's field `body` with the current `x-amples` instance `request.body`

In other words, the following spec:

```yaml
paths:
  '/user/{username}':
    parameters:
      - description: Username
        in: path
        name: username
        required: true
        type: string
        x-ample: usernameInPath
      - description: Display Name
        in: path
        name: display_name
        required: true
        type: string
        x-ample: displayNameInPath
    get:
      description: Get user
      parameters:
        - description: Display Name
          in: path
          name: display_name
          required: true
          type: string
          x-ample: displayNameInMethod
        - description: Email
          in: path
          name: email
          required: true
          type: string
          x-ample: emailInMethod
      responses:
        '200':
          description: OK
          x-amples:
            - description: should return user
              request:
                headers:
                  some_header: header
                parameters:
                  email: emailInExample
                body:
                  some_body: example
```

will resulted into the following `options` object for the `swagger-client`:

```js
{
    username: 'usernameInPath',
    display_name: 'displayNameInMethod',
    email: 'emailInExample',
    some_header: 'header',
    body: {
        some_body: 'example'
    }
}
```

For the reference, here is a sample response object from `swagger-client`
 (not that what we usually refer to as a `body` in the responses for some reason called `obj`):

```js
{
    "data": "{\"version\":\"1.1\"}"
    "headers": {
        "connection": "close"
        "content-length": "17"
        "content-type": "application/json; charset=utf-8"
        "date": "Fri, 17 Feb 2017 04:50:59 GMT"
        "etag": "W/\"11-NrB2yjXryoCwCkVzPW8jaQ\""
        "x-powered-by": "Express"
    }
    "method": "GET"
    "obj": {
        "version": "1.1"
    }
    "status": 200
    "statusText": "{\"version\":\"1.1\"}"
    "url": "http://localhost:8081/api/info"
}
```

# Auth

The idea is to add `x-ample` to your `securityDefinitions`,
 so that it will be possible to find it automatically based on method `security` definitions.
You need to enable `auth: true` for your example,
 so if it is not explicitly enabled, we will get a test failure.

Sometimes it is handy to save auth data from specific response and use it for other requests.
For instance, we have `POST /auth_token` endpoint with `Basic` auth,
 that is returns simple JSON `{ "auth_token": "abc" }`. And we want to use this token later for other requests.
To achieve that you can use `authProviderFor` in a given example,
 that will define an `x-ample` for a given `securityDefinitions`.
There is `obj` and `headers` available in the context of `x-ample` string.
In the example below you can find how to achieve this:

```yaml
securityDefinitions:
  Basic:
    type: basic
    description: Password auth
    x-ample:
      username: foo
      password: bar
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
                  x-ample: 'Bearer ${obj.auth_token}' # define how resulting auth example should looks like
              response:
                obj:
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
        '401':
          description: Unauthorized
```

# Programmatically

```js
'use strict';

let STS = require('swagger-t-str');

let options = {
    url: 'http://localhost:8081',
    spec: './swagger.yml'
};
let sts = new STS(options);
sts.start(function(failures){
    console.log(failures);
});
```