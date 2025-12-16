# REST Feature

The REST feature in Awsless provides a streamlined way to define, configure, and deploy REST APIs using Amazon API Gateway HTTP APIs and Lambda functions. It handles the complex aspects of API setup including routing, integrations, and custom domains.

## Overview

REST APIs are a standard approach for building web services. The REST feature in Awsless makes it easy to:

- Define REST routes with different HTTP methods
- Implement route handlers with Lambda functions
- Configure API Gateway for high performance and scalability
- Set up custom domains with SSL certificates
- Deploy and manage REST APIs with minimal configuration

## Schema

The REST feature uses a two-part schema to define APIs:

1. **Global REST API definition** in `app.json`
2. **Stack-specific REST routes** in stack files

### Global REST API Definition

In your `app.json` file, you define the global REST API configuration:

```json
{
  "defaults": {
    "rest": {
      "api": {
        "domain": "example-domain",
        "subDomain": "api"
      }
    }
  }
}
```

### Stack-Specific REST Routes

In your stack files, you define the REST routes and their handlers:

```json
{
  "rest": {
    "api": {
      "GET /users": "./src/get-users.ts",
      "GET /users/{id}": {
        "code": {
          "file": "./src/get-user.ts",
          "minify": true
        },
        "memorySize": "256 MB"
      },
      "POST /users": "./src/create-user.ts",
      "PUT /users/{id}": "./src/update-user.ts",
      "DELETE /users/{id}": "./src/delete-user.ts",
      "$default": "./src/default-handler.ts"
    }
  }
}
```

### Schema Properties

#### Global REST API Properties

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `domain` | String | Domain ID to link your REST API with | - |
| `subDomain` | String | Subdomain for your API | - |

#### Stack-Specific REST Routes

Each route is defined with a key in the format `METHOD /path` and a value that can be:

- A string path to a Lambda function file
- A full Lambda function configuration object

The route path can include path parameters in the format `{paramName}`, which will be passed to the Lambda function.

Supported HTTP methods:
- GET
- POST
- PUT
- DELETE
- HEAD
- OPTIONS

You can also define a `$default` route that will handle any requests that don't match other routes.

## How REST APIs Work

When you define a REST API in Awsless:

1. An API Gateway HTTP API is created
2. A stage (v1) is created for the API
3. Lambda functions are created for each route handler
4. Integrations are created to connect routes to Lambda functions
5. Routes are created to map HTTP methods and paths to integrations
6. If a domain is specified, a custom domain name is created and mapped to the API

When a client makes a request to your API:

1. The request is received by API Gateway
2. API Gateway routes the request to the appropriate Lambda function based on the HTTP method and path
3. The Lambda function processes the request and returns a response
4. API Gateway forwards the response back to the client

## Route Handlers

Route handlers are Lambda functions that receive HTTP requests and return HTTP responses. API Gateway uses the HTTP API payload format version 2.0, which has this structure:

```typescript
export default async function(event: {
  version: string;
  routeKey: string;
  rawPath: string;
  rawQueryString: string;
  headers: Record<string, string>;
  queryStringParameters?: Record<string, string>;
  cookies?: string[];
  pathParameters?: Record<string, string>;
  requestContext: {
    accountId: string;
    apiId: string;
    domainName: string;
    domainPrefix: string;
    http: {
      method: string;
      path: string;
      protocol: string;
      sourceIp: string;
      userAgent: string;
    };
    requestId: string;
    routeKey: string;
    stage: string;
    time: string;
    timeEpoch: number;
  };
  body?: string;
  isBase64Encoded: boolean;
}) {
  // Access path parameters
  const userId = event.pathParameters?.id;

  // Access query parameters
  const filter = event.queryStringParameters?.filter;

  // Access request body
  const data = event.body ? JSON.parse(event.body) : undefined;

  // Return a response
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: userId,
      name: 'John Doe',
      email: 'john@example.com'
    })
  };
}
```

## Custom Domains

You can configure your REST API to use a custom domain by specifying the `domain` and `subDomain` properties in the global REST API definition. The domain must be defined in your app configuration and have a valid SSL certificate.

For example, if you specify:

```json
{
  "domain": "example-domain",
  "subDomain": "api"
}
```

Your API will be available at `https://api.example.com`.

## Path Parameters

You can define path parameters in your routes using curly braces:

```json
{
  "rest": {
    "api": {
      "GET /users/{id}": "./src/get-user.ts",
      "GET /products/{category}/{id}": "./src/get-product.ts"
    }
  }
}
```

These parameters are passed to your Lambda function in the `event.pathParameters` object:

```typescript
export default async function(event) {
  const userId = event.pathParameters?.id;
  // or
  const { category, id } = event.pathParameters || {};

  // ...
}
```

## Default Route

You can define a default route that will handle any requests that don't match other routes:

```json
{
  "rest": {
    "api": {
      "$default": "./src/default-handler.ts"
    }
  }
}
```

This is useful for implementing custom 404 handlers or for APIs with dynamic routes that can't be defined statically.

## Differences from HTTP Feature

While both the REST and HTTP features allow you to create HTTP APIs, they use different AWS services:

- **REST Feature**: Uses Amazon API Gateway HTTP APIs
- **HTTP Feature**: Uses AWS Application Load Balancer (ALB)

API Gateway HTTP APIs are generally more cost-effective for low to medium traffic APIs, while ALBs may be more suitable for high-traffic APIs or when you need advanced routing capabilities.

## Best Practices

When using the REST feature, consider these best practices:

1. **Use RESTful Routes**: Follow RESTful conventions for your API routes
2. **Validate Input**: Validate all input parameters and request bodies
3. **Return Proper Status Codes**: Use appropriate HTTP status codes in responses
4. **Handle Errors Gracefully**: Implement proper error handling in your route handlers
5. **Use Path Parameters Wisely**: Use path parameters for resource identifiers
6. **Use Query Parameters for Filtering**: Use query parameters for filtering, sorting, and pagination
7. **Document Your API**: Consider generating API documentation from your code

## Integration with Other Features

The REST feature integrates seamlessly with other Awsless features:

- **Function**: REST route handlers are implemented as Lambda functions
- **Domain**: Custom domains can be used for REST APIs
- **Auth**: Authentication can be integrated with REST APIs
- **Table**: DynamoDB tables can be accessed from route handlers
- **Queue**: SQS queues can be used for asynchronous operations
- **Topic**: SNS topics can be used for event-driven architectures
