# Config Feature

The Config feature in Awsless provides a streamlined way to define, manage, and access configuration values using AWS Systems Manager Parameter Store. It handles the complex aspects of configuration management including parameter storage, access control, and type-safe access from your application code.

## Overview

Configuration management is essential for maintaining application settings across different environments. The Config feature in Awsless makes it easy to:

- Define configuration parameters for your application
- Store sensitive configuration values securely
- Access configuration values from Lambda functions
- Use type-safe configuration access from your application code
- Manage configuration values through the CLI

## Schema

The Config feature uses a simple schema to define configuration parameters in your stack:

```json
{
  "configs": [
    "API_KEY",
    "DATABASE_URL",
    "STRIPE_SECRET_KEY"
  ]
}
```

Each item in the `configs` array is a string that represents a configuration parameter name. The names should follow these rules:

- Use only lowercase letters, numbers, and hyphens
- Choose descriptive names that reflect the purpose of the configuration
- Use consistent naming conventions across your application

## How Config Works

When you define configuration parameters in Awsless:

1. The parameters are registered in your stack
2. IAM permissions are set up to allow access to the parameters
3. Environment variables are set in your Lambda functions to enable access to the parameters
4. Type definitions are generated for type-safe access from your application code

The actual parameter values are stored in AWS Systems Manager Parameter Store under a path specific to your application: `/.awsless/{app-name}/{param-name}`.

## Setting Configuration Values

You can set configuration values using the Awsless CLI:

```bash
# Set a configuration value
pnpm awsless config set API_KEY "your-api-key"

# Set a configuration value for a specific stack
pnpm awsless config set DATABASE_URL "postgres://user:pass@host:port/db" --stack database
```

## Getting Configuration Values

You can get configuration values using the Awsless CLI:

```bash
# Get a configuration value
pnpm awsless config get API_KEY

# Get a configuration value for a specific stack
pnpm awsless config get DATABASE_URL --stack database
```

## Listing Configuration Values

You can list all configuration values using the Awsless CLI:

```bash
# List all configuration values
pnpm awsless config list

# List configuration values for a specific stack
pnpm awsless config list --stack database
```

## Deleting Configuration Values

You can delete configuration values using the Awsless CLI:

```bash
# Delete a configuration value
pnpm awsless config delete API_KEY

# Delete a configuration value for a specific stack
pnpm awsless config delete DATABASE_URL --stack database
```

## Accessing Configuration Values in Code

One of the key benefits of the Config feature is type-safe access to configuration values from your application code. When you run `pnpm awsless dev`, Awsless generates TypeScript definitions for all your configuration parameters, allowing you to access them with full type safety:

```typescript
import { Config } from '@awsless/awsless'

// Access configuration values
const apiKey = await Config.API_KEY
const databaseUrl = await Config.DATABASE_URL
const stripeKey = await Config.STRIPE_SECRET_KEY

// Use configuration values
const api = new API(apiKey)
const db = new Database(databaseUrl)
const stripe = new Stripe(stripeKey)
```

## Environment Variables

For each configuration parameter, Awsless automatically sets the following environment variables in your Lambda functions:

```
CONFIG_API_KEY=API_KEY
CONFIG_DATABASE_URL=DATABASE_URL
CONFIG_STRIPE_SECRET_KEY=STRIPE_SECRET_KEY
```

These environment variables contain the parameter names, not the actual values. The actual values are retrieved from Parameter Store at runtime.

You can use these environment variables to access configuration values directly:

```typescript
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm'

const ssm = new SSMClient()
const appName = process.env.APP_NAME

const getConfig = async (name: string) => {
  const result = await ssm.send(
    new GetParameterCommand({
      Name: `/.awsless/${appName}/${name}`,
      WithDecryption: true,
    })
  )
  return result.Parameter?.Value
}

// Access configuration values
const apiKey = await getConfig(process.env.CONFIG_API_KEY)
```

However, it's recommended to use the `Config` object from `@awsless/awsless` instead, as it provides type safety and handles caching and error handling.

## Security Considerations

Configuration values are stored in AWS Systems Manager Parameter Store, which provides:

- Encryption at rest using AWS KMS
- Fine-grained access control using IAM
- Audit trails through AWS CloudTrail

By default, all Lambda functions in your stack have permission to access only the configuration parameters defined in that stack. This follows the principle of least privilege, ensuring that functions can only access the configuration values they need.

## Best Practices

When using the Config feature, consider these best practices:

1. **Use for Sensitive Information**: Store sensitive information like API keys, database credentials, and secrets in configuration parameters
2. **Don't Store Large Values**: Parameter Store has a size limit of 4KB for standard parameters
3. **Use Consistent Naming**: Follow a consistent naming convention for your configuration parameters
4. **Limit Access**: Only grant access to configuration parameters to the functions that need them
5. **Rotate Secrets Regularly**: Regularly update sensitive configuration values like API keys and passwords
6. **Use Different Values per Environment**: Use different configuration values for development, staging, and production environments

## Integration with Other Features

The Config feature integrates seamlessly with other Awsless features:

- **Function**: Lambda functions can access configuration values
- **Task**: Tasks can access configuration values
- **Queue**: Queue consumers can access configuration values
- **Topic**: Topic subscribers can access configuration values
- **Cron**: Cron jobs can access configuration values
- **GraphQL**: GraphQL resolvers can access configuration values
- **HTTP**: HTTP route handlers can access configuration values
- **REST**: REST route handlers can access configuration values
