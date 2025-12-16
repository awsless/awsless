# HTTP Feature

The HTTP feature in Awsless provides a streamlined way to define, configure, and deploy HTTP APIs using AWS Application Load Balancer (ALB) and Lambda functions. It handles the complex aspects of API setup including routing, load balancing, SSL termination, and custom domains.

## Overview

HTTP APIs are essential for building web applications and services. The HTTP feature in Awsless makes it easy to:

- Define HTTP routes with different methods (GET, POST, PUT, DELETE, etc.)
- Implement route handlers with Lambda functions
- Configure Application Load Balancers for high availability
- Set up custom domains with SSL certificates
- Generate TypeScript types for type-safe client usage
- Deploy and manage HTTP APIs with minimal configuration

## Schema

The HTTP feature uses a two-part schema to define APIs:

1. **Global HTTP API definition** in `app.json`
2. **Stack-specific HTTP routes** in stack files

### Global HTTP API Definition

In your `app.json` file, you define the global HTTP API configuration:

```json
{
  "defaults": {
    "http": {
      "api": {
        "domain": "example-domain",
        "subDomain": "api"
      }
    }
  }
}
```

### Stack-Specific HTTP Routes

In your stack files, you define the HTTP routes and their handlers:

```json
{
  "http": {
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
      "DELETE /users/{id}": "./src/delete-user.ts"
    }
  }
}
```

### Schema Properties

#### Global HTTP API Properties

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `domain` | String | Domain ID to link your HTTP API with | Required |
| `subDomain` | String | Subdomain for your API | - |

#### Stack-Specific HTTP Routes

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

## How HTTP APIs Work

When you define an HTTP API in Awsless:

1. An Application Load Balancer (ALB) is created in your VPC
2. A listener is configured for HTTPS on port 443
3. Lambda functions are created for each route handler
4. Target groups are created to connect routes to Lambda functions
5. Listener rules are created to route requests to the appropriate target groups
6. If a domain is specified, Route 53 records are created

When a client makes a request to your API:

1. The request is received by the ALB
2. The ALB routes the request to the appropriate Lambda function based on the HTTP method and path
3. The Lambda function processes the request and returns a response
4. The ALB forwards the response back to the client

## Route Handlers

Route handlers are Lambda functions that receive HTTP requests and return HTTP responses:

```typescript
export default async function(event: {
  request: {
    method: string;
    path: string;
    queryStringParameters: Record<string, string>;
    headers: Record<string, string>;
    body: any;
    pathParameters: Record<string, string>;
  }
}) {
  // Access path parameters
  const userId = event.request.pathParameters.id;

  // Access query parameters
  const filter = event.request.queryStringParameters.filter;

  // Access request body
  const data = event.request.body;

  // Return a response
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    body: {
      id: userId,
      name: 'John Doe',
      email: 'john@example.com'
    }
  };
}
```

## Type-Safe Client Usage

One of the key benefits of the HTTP feature is type-safe client usage. When you run `pnpm awsless dev`, Awsless generates TypeScript types based on your HTTP routes:

```typescript
import { HTTP } from '@awsless/awsless/client'

// GET request with path parameter
const user = await HTTP.api.GET['/users/{id}']({
  param: { id: '123' },
  query: { include: 'profile' }
})

// POST request with body
const newUser = await HTTP.api.POST['/users']({
  body: {
    name: 'John Doe',
    email: 'john@example.com'
  }
})

// PUT request with path parameter and body
await HTTP.api.PUT['/users/{id}']({
  param: { id: '123' },
  body: {
    name: 'John Updated'
  }
})

// DELETE request with path parameter
await HTTP.api.DELETE['/users/{id}']({
  param: { id: '123' }
})
```

The types are generated based on the request and response types of your Lambda functions, providing end-to-end type safety.

## Custom Domains

You can configure your HTTP API to use a custom domain by specifying the `domain` and `subDomain` properties in the global HTTP API definition. The domain must be defined in your app configuration and have a valid SSL certificate.

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
  "http": {
    "api": {
      "GET /users/{id}": "./src/get-user.ts",
      "GET /products/{category}/{id}": "./src/get-product.ts"
    }
  }
}
```

These parameters are passed to your Lambda function in the `event.request.pathParameters` object:

```typescript
export default async function(event) {
  const userId = event.request.pathParameters.id;
  // or
  const { category, id } = event.request.pathParameters;

  // ...
}
```

## Best Practices

When using the HTTP feature, consider these best practices:

1. **Use RESTful Routes**: Follow RESTful conventions for your API routes
2. **Validate Input**: Validate all input parameters and request bodies
3. **Return Proper Status Codes**: Use appropriate HTTP status codes in responses
4. **Handle Errors Gracefully**: Implement proper error handling in your route handlers
5. **Use Path Parameters Wisely**: Use path parameters for resource identifiers
6. **Use Query Parameters for Filtering**: Use query parameters for filtering, sorting, and pagination
7. **Document Your API**: Consider generating API documentation from your code

## Integration with Other Features

The HTTP feature integrates seamlessly with other Awsless features:

- **Function**: HTTP route handlers are implemented as Lambda functions
- **Domain**: Custom domains can be used for HTTP APIs
- **Auth**: Authentication can be integrated with HTTP APIs
- **Table**: DynamoDB tables can be accessed from route handlers
- **Queue**: SQS queues can be used for asynchronous operations
- **Topic**: SNS topics can be used for event-driven architectures
