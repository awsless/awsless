# GraphQL Feature

The GraphQL feature in Awsless provides a streamlined way to define, configure, and deploy GraphQL APIs using AWS AppSync. It handles the complex aspects of GraphQL API setup including schema definition, resolvers, authentication, and custom domains.

## Overview

GraphQL is a query language for APIs that enables clients to request exactly the data they need. The GraphQL feature in Awsless makes it easy to:

- Define GraphQL schemas using SDL (Schema Definition Language)
- Create resolvers backed by Lambda functions
- Configure authentication and authorization
- Set up custom domains with SSL certificates
- Generate TypeScript types for type-safe client usage
- Deploy and manage GraphQL APIs with minimal configuration

## Schema

The GraphQL feature uses a two-part schema to define APIs:

1. **Global GraphQL API definition** in `app.json`
2. **Stack-specific GraphQL schema and resolvers** in stack files

### Global GraphQL API Definition

In your `app.json` file, you define the global GraphQL API configuration:

```json
{
  "defaults": {
    "graphql": {
      "api": {
        "domain": "example-domain",
        "subDomain": "graphql",
        "auth": "auth-user-pool",
        "resolver": "./src/default-resolver.js"
      }
    }
  }
}
```

### Stack-Specific GraphQL Definition

In your stack files, you define the GraphQL schema and resolvers:

```json
{
  "graphql": {
    "api": {
      "schema": "./src/schema.graphql",
      "resolvers": {
        "Query": {
          "getUser": "./src/get-user.ts",
          "listUsers": {
            "consumer": "./src/list-users.ts",
            "resolver": "./src/custom-resolver.js"
          }
        },
        "Mutation": {
          "createUser": "./src/create-user.ts"
        }
      }
    }
  }
}
```

### Schema Properties

#### Global GraphQL API Properties

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `domain` | String | Domain ID to link your GraphQL API with | - |
| `subDomain` | String | Subdomain for your API | - |
| `auth` | String/Object | Authentication configuration | - |
| `resolver` | String | Path to default resolver implementation | - |

#### Authentication Options

The `auth` property can be:

- A string ID referencing a Cognito User Pool
- An object with Lambda authorizer configuration:
  ```json
  {
    "auth": {
      "authorizer": "./src/authorizer.ts",
      "ttl": "1 hour"
    }
  }
  ```
- Omitted for IAM authentication

#### Stack-Specific GraphQL Properties

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `schema` | String | Path to GraphQL schema file | Required |
| `resolvers` | Object | Map of type and field resolvers | - |

#### Resolver Configuration

Each resolver can be:

- A string path to a Lambda function file
- An object with consumer and custom resolver:
  ```json
  {
    "consumer": "./src/resolver-function.ts",
    "resolver": "./src/custom-resolver.js"
  }
  ```

## GraphQL Schema

The GraphQL schema is defined using SDL in a `.graphql` file:

```graphql
type User {
  id: ID!
  name: String!
  email: String!
  createdAt: AWSDateTime!
}

type Query {
  getUser(id: ID!): User
  listUsers: [User!]!
}

type Mutation {
  createUser(name: String!, email: String!): User!
}
```

Awsless automatically adds the following scalar types:
- `AWSDate`
- `AWSTime`
- `AWSDateTime`
- `AWSTimestamp`
- `AWSEmail`
- `AWSJSON`
- `AWSURL`
- `AWSPhone`
- `AWSIPAddress`

## Resolvers

Resolvers are Lambda functions that handle GraphQL operations. Each resolver receives the GraphQL arguments and context, and returns the resolved data.

### Default Resolver

```javascript
export function request(ctx) {
  return {
    operation: 'Invoke',
    payload: ctx.arguments,
  };
}

export function response(ctx) {
  return ctx.result;
}
```

### Custom Resolver

You can create custom resolvers to implement more complex logic:

```javascript
export function request(ctx) {
  // Custom request mapping template
  return {
    operation: 'Invoke',
    payload: {
      ...ctx.arguments,
      userId: ctx.identity.sub,
    },
  };
}

export function response(ctx) {
  // Custom response mapping template
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  return ctx.result;
}
```

## Authentication

The GraphQL feature supports multiple authentication methods:

### Cognito User Pools

```json
{
  "auth": "auth-user-pool"
}
```

This references a Cognito User Pool defined in the auth feature.

### Lambda Authorizer

```json
{
  "auth": {
    "authorizer": "./src/authorizer.ts",
    "ttl": "1 hour"
  }
}
```

The authorizer function receives the request context and returns an authorization response:

```typescript
export default async function(event: {
  authorizationToken: string;
  requestContext: {
    apiId: string;
    accountId: string;
    requestId: string;
    queryString: string;
    variables: Record<string, any>;
    operationName: string | null;
  };
}) {
  // Validate the token
  const user = validateToken(event.authorizationToken);

  // Return authorization response
  return {
    isAuthorized: true,
    resolverContext: {
      userId: user.id,
      roles: user.roles
    },
    ttlOverride: 300 // Optional: override TTL in seconds
  };
}
```

### IAM Authentication

If no auth property is specified, IAM authentication is used by default.

## Custom Domains

You can configure your GraphQL API to use a custom domain by specifying the `domain` and `subDomain` properties in the global GraphQL API definition. The domain must be defined in your app configuration and have a valid SSL certificate.

For example, if you specify:

```json
{
  "domain": "example-domain",
  "subDomain": "graphql"
}
```

Your API will be available at `https://graphql.example.com`.

## Type Generation

One of the key benefits of the GraphQL feature is automatic TypeScript type generation. When you run `pnpm awsless dev`, Awsless generates TypeScript types based on your GraphQL schema:

```typescript
import { GraphQL } from '@awsless/awsless/client'

// Type-safe GraphQL operations
const user = await GraphQL.api.getUser({ id: '123' })
// user is typed as User from your schema

const users = await GraphQL.api.listUsers()
// users is typed as User[] from your schema

const newUser = await GraphQL.api.createUser({
  name: 'John Doe',
  email: 'john@example.com'
})
// newUser is typed as User from your schema
```

## Best Practices

When using the GraphQL feature, consider these best practices:

1. **Design Your Schema Carefully**: Focus on the domain model and use cases
2. **Use Custom Resolvers for Complex Logic**: Implement custom resolvers for complex operations
3. **Implement Proper Authentication**: Secure your API with appropriate authentication
4. **Optimize Resolver Performance**: Keep resolvers fast and efficient
5. **Use DataLoader Pattern**: Implement DataLoader pattern to avoid N+1 query problems
6. **Monitor API Usage**: Use CloudWatch to monitor API usage and errors
7. **Version Your API**: Consider versioning strategies for evolving APIs

## Integration with Other Features

The GraphQL feature integrates seamlessly with other Awsless features:

- **Function**: GraphQL resolvers are implemented as Lambda functions
- **Auth**: Cognito User Pools can be used for authentication
- **Domain**: Custom domains can be used for GraphQL APIs
- **Table**: DynamoDB tables can be accessed from resolvers
- **Queue**: SQS queues can be used for asynchronous operations
- **Topic**: SNS topics can be used for event-driven architectures
