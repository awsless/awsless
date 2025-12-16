# RPC Feature

The RPC (Remote Procedure Call) feature in Awsless provides a streamlined way to expose Lambda functions as type-safe API endpoints for your frontend applications. It handles the complex aspects of API setup including authentication, CORS, CDN distribution, and domain configuration.

## Overview

RPC (Remote Procedure Call) is a pattern that allows client applications to call server functions as if they were local functions. The RPC feature in Awsless makes it easy to:

- Expose Lambda functions as API endpoints
- Maintain end-to-end type safety between frontend and backend
- Set up authentication for your API
- Configure custom domains with SSL
- Optimize performance with CloudFront CDN
- Automatically generate TypeScript client code

## Schema

The RPC feature uses a two-part schema to define APIs:

1. **Global RPC API definition** in `app.json`
2. **Stack-specific RPC function definitions** in stack files

### Global RPC API Definition

In your `app.json` file, you define the global RPC API configuration:

```json
{
  "defaults": {
    "rpc": {
      "api": {
        "domain": "example-domain",
        "subDomain": "api",
        "auth": "./src/auth-handler.ts",
        "log": true
      }
    }
  }
}
```

### Stack-Specific RPC Function Definitions

In your stack files, you define the functions that will be exposed through the RPC API:

```json
{
  "rpc": {
    "api": {
      "GetUser": "./src/get-user.ts",
      "CreateUser": {
        "code": {
          "file": "./src/create-user.ts",
          "minify": true
        },
        "memorySize": "512 MB",
        "timeout": "10 seconds"
      }
    }
  }
}
```

### Schema Properties

#### Global RPC API Properties

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `domain` | String | Domain ID to link your RPC API with | - |
| `subDomain` | String | Subdomain for your API | - |
| `auth` | Object/String | Lambda function for API authentication | - |
| `log` | Object/Boolean | Logging configuration | - |

#### Stack-Specific RPC Function Properties

Each function in the RPC definition accepts all the same configuration options as the Function feature. For detailed information about these options, please refer to the [Function documentation](Function.md).

## How RPC Works

When you define an RPC API in Awsless:

1. A Lambda function URL is created to handle API requests
2. A DynamoDB table is created to store the schema mapping
3. Each RPC function is registered in the schema table
4. A CloudFront distribution is set up for caching and performance
5. If a domain is specified, Route 53 records are created
6. If an auth function is specified, it's integrated with the API

When a client calls an RPC function:

1. The request is sent to the CloudFront distribution
2. The request is forwarded to the Lambda function URL
3. The Lambda function looks up the requested function in the schema table
4. If authentication is required, the auth function is invoked
5. The target Lambda function is invoked with the request payload
6. The response is returned to the client through CloudFront

## Type-Safe Client Usage

One of the key benefits of the RPC feature is type-safe client usage. When you run `pnpm awsless dev`, Awsless generates TypeScript definitions for all your RPC functions, allowing you to call them with full type safety:

```typescript
import { RPC } from '@awsless/awsless/client'

// Call an RPC function with proper type checking
const user = await RPC.api.GetUser({ id: '123' })

// Create a user with proper type checking
await RPC.api.CreateUser({
  name: 'John Doe',
  email: 'john@example.com'
})
```

The request and response types are automatically inferred from your Lambda function's payload and return value, giving you end-to-end type safety.

## Authentication

You can secure your RPC API by providing an auth function. This function will be invoked for each request and can implement custom authentication logic:

```typescript
export default async function(event: {
  headers: Record<string, string>;
  query: string;
}) {
  // Get the Authorization header
  const token = event.headers.Authorization;

  if (!token) {
    throw new Error('Unauthorized');
  }

  // Validate the token and return user information
  const user = validateToken(token);

  // Return user context that will be passed to the RPC function
  return {
    userId: user.id,
    roles: user.roles
  };
}
```

The auth function's return value will be passed to your RPC functions as the `context` parameter:

```typescript
export default async function(payload: any, context: any) {
  // Access the user context from the auth function
  const { userId, roles } = context;

  // Check permissions
  if (!roles.includes('admin')) {
    throw new Error('Forbidden');
  }

  // Process the request
  // ...
}
```

## Custom Domains

You can configure your RPC API to use a custom domain by specifying the `domain` and `subDomain` properties in the global RPC API definition. The domain must be defined in your app configuration and have a valid SSL certificate.

For example, if you specify:

```json
{
  "domain": "example-domain",
  "subDomain": "api"
}
```

Your API will be available at `https://api.example.com`.

## Best Practices

When using the RPC feature, consider these best practices:

1. **Keep Functions Focused**: Each RPC function should do one thing well
2. **Use Proper Error Handling**: Return meaningful error messages to clients
3. **Implement Authentication**: Secure your API with proper authentication
4. **Validate Input**: Validate all input parameters to prevent security issues
5. **Use Appropriate Timeouts**: Configure timeouts based on the expected execution time
6. **Monitor API Usage**: Use CloudWatch to monitor API usage and errors
7. **Optimize for Performance**: Keep response sizes small and processing time low

## Integration with Other Features

The RPC feature integrates seamlessly with other Awsless features:

- **Function**: RPC endpoints are implemented as Lambda functions
- **Domain**: Custom domains can be used for RPC APIs
- **Table**: RPC functions can interact with DynamoDB tables
- **Queue**: RPC functions can send messages to queues
- **Topic**: RPC functions can publish messages to topics
