# swagger-t-str

Swagger Specification-Driven test framework

[![Build Status](https://travis-ci.org/travis-ci/travis-web.svg?branch=master)](https://travis-ci.org/travis-ci/travis-web)

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

For each request you can add a list of `x-amples`, specifying set of different request attributes and corresponding response for each.

If no `x-amples` provided, endpoint will be tested against given HTTP method with empty request object and only response code will be validated.

```yaml
paths:
  /auth_token:
    post:
      description: Get auth token for username+password pair
      responses:
        '200':
          description: OK
          x-amples:
            - description: Test auth token ok
              request:
                headers:
                  Authorization: qwe
              response:
                body:
                  auth_token: 'abc'
        '401':
          description: Unauthorized
```

Output:

```spec
  http://localhost:8081/api
    /auth_token
      POST
        200
          ✓ POST 200: Test auth token ok
        401
          ✓ POST 401: default
```

# Parameterized URL

It is supported an automatic URL parameters substitution from `x-amples` list of parameters.

In the example below it is demonstrated how to perform a `DELETE` request to `/auth_token/xyz`

```yaml
paths:
  '/auth_token/{token}':
    delete:
      description: Delete token
      parameters:
        - description: Token
          in: path
          name: token
          required: true
          type: string
      responses:
        '200':
          description: OK
          x-amples:
            - description: Test auth token deletion ok
              request:
                headers:
                  Authorization: Bearer abc
                parameters:
                  token: xyz
        '401':
          description: Unauthorized
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