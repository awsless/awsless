# Auth Feature

The Auth feature in Awsless provides a streamlined way to define, configure, and manage user authentication using Amazon Cognito. It handles the complex aspects of authentication setup including user pools, client apps, password policies, and Lambda triggers.

## Overview

Authentication is a critical component of most applications, providing secure user access and identity management. The Auth feature in Awsless makes it easy to:

- Create and configure Amazon Cognito User Pools
- Define password policies and security requirements
- Configure email messaging for user communications
- Set up Lambda triggers for custom authentication flows
- Integrate authentication with other Awsless features
- Access authentication resources from your application code

## Schema

The Auth feature uses a two-part schema to define authentication:

1. **Global Auth definition** in `app.json`
2. **Stack-specific Auth triggers** in stack files

### Global Auth Definition

In your `app.json` file, you define the global authentication configuration:

```json
{
  "defaults": {
    "auth": {
      "main": {
        "allowUserRegistration": true,
        "messaging": {
          "fromEmail": "no-reply@example.com",
          "fromName": "My App",
          "replyTo": "support@example.com"
        },
        "username": {
          "emailAlias": true,
          "caseSensitive": false
        },
        "password": {
          "minLength": 12,
          "uppercase": true,
          "lowercase": true,
          "numbers": true,
          "symbols": true,
          "temporaryPasswordValidity": "7 days"
        },
        "validity": {
          "idToken": "1 hour",
          "accessToken": "1 hour",
          "refreshToken": "365 days"
        }
      }
    }
  }
}
```

### Stack-Specific Auth Triggers

In your stack files, you define Lambda triggers for authentication flows:

```json
{
  "auth": {
    "main": {
      "access": true,
      "triggers": {
        "beforeLogin": "./src/auth/before-login.ts",
        "afterLogin": "./src/auth/after-login.ts",
        "beforeRegister": {
          "code": {
            "file": "./src/auth/before-register.ts",
            "minify": true
          },
          "memorySize": "256 MB"
        },
        "customMessage": "./src/auth/custom-message.ts"
      }
    }
  }
}
```

### Schema Properties

#### Global Auth Properties

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `allowUserRegistration` | Boolean | Allow users to self-register | `true` |
| `messaging` | Object | Email configuration for user communications | - |
| `username` | Object | Username policy configuration | See below |
| `password` | Object | Password policy configuration | See below |
| `validity` | Object | Token validity durations | See below |
| `triggers` | Object | Global Lambda triggers | - |

#### Username Policy Properties

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `emailAlias` | Boolean | Allow email as username | `true` |
| `caseSensitive` | Boolean | Enable case-sensitive usernames | `false` |

#### Password Policy Properties

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `minLength` | Number | Minimum password length | `12` |
| `uppercase` | Boolean | Require uppercase letters | `true` |
| `lowercase` | Boolean | Require lowercase letters | `true` |
| `numbers` | Boolean | Require numbers | `true` |
| `symbols` | Boolean | Require symbols | `true` |
| `temporaryPasswordValidity` | String | Temporary password validity duration | `7 days` |

#### Token Validity Properties

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `idToken` | String | ID token validity duration | `1 hour` |
| `accessToken` | String | Access token validity duration | `1 hour` |
| `refreshToken` | String | Refresh token validity duration | `365 days` |

#### Stack-Specific Auth Properties

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `access` | Boolean | Grant access to Cognito for all functions in the stack | `false` |
| `triggers` | Object | Lambda triggers for authentication flows | - |

#### Lambda Triggers

| Trigger | Description |
|---------|-------------|
| `beforeToken` | Pre JWT token generation |
| `beforeLogin` | Pre user login |
| `afterLogin` | Post user login |
| `beforeRegister` | Pre user registration |
| `afterRegister` | Post user registration |
| `customMessage` | Custom message handling |
| `defineChallenge` | Define authentication challenge |
| `createChallenge` | Create authentication challenge |
| `verifyChallenge` | Verify authentication challenge response |

## How Auth Works

When you define authentication in Awsless:

1. A Cognito User Pool is created with your specified configuration
2. A User Pool Client is created for application access
3. Password policies and security settings are configured
4. Email messaging is set up for user communications
5. Lambda triggers are configured for custom authentication flows
6. Environment variables are set for accessing authentication resources

## Lambda Triggers

Lambda triggers allow you to customize the authentication flow with your own code. Each trigger is invoked at a specific point in the authentication process:

### Before Login Trigger

```typescript
export default async function(event: {
  userPoolId: string;
  clientId: string;
  callerContext: {
    awsSdkVersion: string;
    clientId: string;
  };
  userName: string;
  validationData?: Record<string, string>;
  userAttributes: Record<string, string>;
}) {
  // Custom logic before user login
  console.log('User attempting to login:', event.userName);

  // You can modify the event or throw an error to prevent login
  return event;
}
```

### Custom Message Trigger

```typescript
export default async function(event: {
  userPoolId: string;
  clientId: string;
  callerContext: {
    awsSdkVersion: string;
    clientId: string;
  };
  triggerSource: string;
  request: {
    codeParameter: string;
    usernameParameter: string;
    userAttributes: Record<string, string>;
  };
  response: {
    smsMessage: string;
    emailMessage: string;
    emailSubject: string;
  };
}) {
  // Customize messages based on trigger source
  if (event.triggerSource === 'CustomMessage_SignUp') {
    event.response.emailSubject = 'Welcome to Our App!';
    event.response.emailMessage = `Your verification code is ${event.request.codeParameter}`;
  }

  return event;
}
```

## Accessing Auth Resources

You can access authentication resources from your application code:

```typescript
import { Auth } from '@awsless/awsless'

// Access User Pool ID and Client ID
const userPoolId = Auth.main.userPoolId
const clientId = Auth.main.clientId

// Use with AWS SDK
import { CognitoIdentityProviderClient, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider'

const cognito = new CognitoIdentityProviderClient()
const command = new ListUsersCommand({
  UserPoolId: userPoolId,
  Limit: 10
})

const result = await cognito.send(command)
```

## Integration with Other Features

The Auth feature integrates seamlessly with other Awsless features:

### GraphQL API Authentication

```json
{
  "defaults": {
    "graphql": {
      "api": {
        "auth": "main"
      }
    }
  }
}
```

### RPC API Authentication

```json
{
  "defaults": {
    "rpc": {
      "api": {
        "auth": "main"
      }
    }
  }
}
```

### Function Access to Auth

```json
{
  "auth": {
    "main": {
      "access": true
    }
  }
}
```

This grants all functions in the stack access to the Cognito User Pool.

## Best Practices

When using the Auth feature, consider these best practices:

1. **Use Strong Password Policies**: Configure appropriate password requirements
2. **Set Appropriate Token Validity**: Balance security and user experience
3. **Implement Custom Triggers**: Use Lambda triggers for custom authentication logic
4. **Secure User Data**: Be careful with user attributes and sensitive information
5. **Test Authentication Flows**: Thoroughly test all authentication scenarios
6. **Monitor Authentication Events**: Set up logging and monitoring for security events
7. **Implement MFA**: Consider multi-factor authentication for sensitive applications

## Email Configuration

To use email features with Cognito, you need to configure a verified domain in the Domain feature:

```json
{
  "defaults": {
    "domains": {
      "main": {
        "domain": "example.com"
      }
    },
    "auth": {
      "main": {
        "messaging": {
          "fromEmail": "no-reply@example.com",
          "fromName": "My App"
        }
      }
    }
  }
}
```

This automatically sets up the necessary SES configuration for sending authentication emails.
