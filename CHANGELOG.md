## 1.1.0

- Massive refactoring, switching to [swagger-client](https://www.npmjs.com/package/swagger-client)

## 1.0.9

- Fix a bug causing swagger-tools to fail validating schema because of circular structures in JSON

## 1.0.8

- Fix schema validation failures not being caught
- Implement auth providers in runtime

## 1.0.7

- Fix issue having parameter both substituted into URL and still be a part of request

## 1.0.6

- Use chai-subset for comparing response
- Use swagger-tools for response schema validation

## 1.0.4

- Fix issue with having all dependencies locked

## 1.0.3

- Implement path (uri) parameters substitution
- Implement Basic and Token auth types
