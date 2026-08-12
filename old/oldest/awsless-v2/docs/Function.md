# Function Feature

The Function feature in Awsless provides a streamlined way to define, configure, and deploy AWS Lambda functions with best practices baked in. It handles the complex aspects of Lambda deployment including code bundling, IAM permissions, logging, and more.

## Overview

AWS Lambda functions are serverless compute resources that run your code in response to events. The Function feature in Awsless makes it easy to:

- Define Lambda functions with TypeScript/JavaScript
- Configure all aspects of Lambda functions through a simple schema
- Bundle and optimize your code automatically
- Set up proper IAM permissions
- Configure logging and monitoring
- Support for container-based Lambda functions
- Type-safe invocation from other parts of your application


## Schema

The Function feature uses a comprehensive schema to define Lambda functions with sensible defaults:

### Basic Usage

The simplest way to define a function is by providing a file path:

```json
{
  "functions": {
    "myFunction": "./src/handler.ts"
  }
}
```

### Advanced Configuration

For more control, you can use the full configuration object:

```json
{
  "functions": {
    "myFunction": {
      "code": {
        "file": "./src/handler.ts",
        "minify": true,
        "external": ["aws-sdk"]
      },
      "runtime": "nodejs20.x",
      "handler": "index.default",
      "memorySize": "512 MB",
      "timeout": "30 seconds",
      "architecture": "arm64",
      "environment": {
        "API_KEY": "your-api-key"
      },
      "permissions": [
        {
          "effect": "allow",
          "actions": ["s3:GetObject"],
          "resources": ["arn:aws:s3:::my-bucket/*"]
        }
      ]
    }
  }
}
```

### Schema Properties

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `code` | Object | Specifies the function code source | Required |
| `code.file` | String | Path to the function code file | - |
| `code.bundle` | String | Path to a directory that needs to be bundled | - |
| `code.minify` | Boolean | Whether to minify the function code | `true` |
| `code.external` | String[] | List of packages that won't be included in the bundle | `[]` |
| `runtime` | String | The Lambda runtime to use | `nodejs20.x` |
| `handler` | String | The handler method within your code | `index.default` |
| `description` | String | Description of the function | - |
| `warm` | Number | Number of instances to keep warm (0-10) | `0` |
| `vpc` | Boolean | Whether to place the function in a VPC | `false` |
| `log` | Object/Boolean | Logging configuration | See below |
| `timeout` | String | Function timeout duration | `10 seconds` |
| `memorySize` | String | Memory allocation for the function | `128 MB` |
| `architecture` | String | CPU architecture (`x86_64` or `arm64`) | `arm64` |
| `ephemeralStorageSize` | String | Size of the /tmp directory | `512 MB` |
| `retryAttempts` | Number | Number of retry attempts (0-2) | `2` |
| `reserved` | Number | Reserved concurrent executions | - |
| `layers` | String[] | List of Lambda layers to use | `[]` |
| `environment` | Object | Environment variables | `{}` |
| `permissions` | Object[] | IAM permissions for the function | `[]` |

### Logging Configuration

The `log` property can be:

- `true` - Enables logging with 7-day retention
- `false` - Disables logging
- A duration string (e.g., `"30 days"`) - Sets specific log retention
- An object with detailed configuration:

```json
{
  "log": {
    "retention": "7 days",
    "level": "error",
    "system": "warn",
    "format": "json",
    "subscription": "./src/log-processor.ts"
  }
}
```

### Permissions

The `permissions` property allows you to define IAM permissions for your function:

```json
{
  "permissions": [
    {
      "effect": "allow",
      "actions": ["dynamodb:GetItem", "dynamodb:PutItem"],
      "resources": ["arn:aws:dynamodb:*:*:table/my-table"]
    }
  ]
}
```

## Type-Safe Invocation

One of the key benefits of the Function feature is type-safe invocation from other parts of your application. When you run `pnpm awsless dev`, Awsless generates TypeScript definitions for all your functions, allowing you to invoke them with full type safety:

```typescript
import { Fn } from '@awsless/awsless'

// Invoke a function with proper type checking
await Fn.myStack.myFunction({
  userId: '123',
  action: 'update'
})
```

## Container Support

The Function feature also supports container-based Lambda functions:

```json
{
  "functions": {
    "containerFunction": {
      "code": {
        "file": "./src/Dockerfile"
      },
      "runtime": "container",
      "architecture": "x86_64"
    }
  }
}
```

## Function Warming

To prevent cold starts, you can configure function warming:

```json
{
  "warm": 2
}
```

This will keep 2 instances of your function warm by invoking them every 5 minutes.

## VPC Support

You can place your function inside a VPC:

```json
{
  "vpc": true
}
```

This will automatically configure the necessary security groups and subnet access.

## Best Practices

The Function feature implements several best practices:

1. **Least Privilege Permissions**: Functions only get the permissions they explicitly need
2. **Proper Error Handling**: Automatic retry configuration and error logging
3. **Optimized Bundling**: Only includes the code your function needs
4. **ARM64 by Default**: Uses the more cost-effective ARM64 architecture by default
5. **JSON Logging**: Structured logging for better searchability
6. **Automatic Asset Management**: Handles S3 buckets and ECR repositories for your function code

## Integration with Other Features

The Function feature integrates seamlessly with other Awsless features:

- **Task**: For background processing
- **Queue**: For SQS integration
- **Topic**: For SNS integration
- **Cron**: For scheduled execution
- **RPC**: For exposing functions as API endpoints
