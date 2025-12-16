# PubSub Feature

The PubSub feature in Awsless provides a streamlined way to define, configure, and use AWS IoT Core for publish-subscribe messaging patterns. It handles the complex aspects of PubSub setup including topic rules, authorizers, custom domains, and Lambda integrations.

## Overview

Publish-subscribe messaging is essential for many real-time applications. The PubSub feature in Awsless makes it easy to:

- Define IoT Core topic rules with SQL filtering
- Configure custom authorizers for secure access
- Set up custom domains for WebSocket connections
- Process messages with Lambda functions
- Integrate PubSub with your application

## Schema

The PubSub feature uses a two-part schema to define PubSub configurations:

1. **Global PubSub API definition** in `app.json`
2. **Stack-specific PubSub subscribers** in stack files

### Global PubSub API Definition

In your `app.json` file, you define the global PubSub API configuration:

```json
{
  "defaults": {
    "pubsub": {
      "realtime": {
        "auth": "./src/pubsub-auth.ts",
        "domain": "example-domain",
        "subDomain": "realtime"
      }
    }
  }
}
```

### Stack-Specific PubSub Subscribers

In your stack files, you define the PubSub subscribers:

```json
{
  "pubsub": {
    "user-status": {
      "sql": "SELECT * FROM '${topic(user/+/status)}'",
      "sqlVersion": "2016-03-23",
      "consumer": "./src/handlers/user-status.ts"
    },
    "device-telemetry": {
      "sql": "SELECT * FROM '${topic(device/+/telemetry)}' WHERE temperature > 30",
      "consumer": {
        "code": {
          "file": "./src/handlers/device-telemetry.ts",
          "minify": true
        },
        "memorySize": "256 MB"
      }
    }
  }
}
```

### Schema Properties

#### Global PubSub API Properties

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `auth` | Object/String | Lambda function for PubSub authentication | Required |
| `domain` | String | Domain ID to link your PubSub API with | - |
| `subDomain` | String | Subdomain for your PubSub API | - |

#### Stack-Specific PubSub Subscriber Properties

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `sql` | String | SQL statement for filtering messages | Required |
| `sqlVersion` | String | Version of the SQL rules engine | `2016-03-23` |
| `consumer` | Object/String | Lambda function for processing messages | Required |

#### SQL Version Options

The `sqlVersion` property can be one of the following values:
- `2015-10-08`: Original version
- `2016-03-23`: Enhanced version with additional features (default)
- `beta`: Beta version with experimental features

## How PubSub Works

When you define a PubSub configuration in Awsless:

1. An IoT Core authorizer is created with your authentication Lambda function
2. IoT Core topic rules are created with your SQL filters
3. Lambda functions are set up to process messages that match the rules
4. If a domain is specified, a custom domain is configured for WebSocket connections
5. The PubSub endpoint and authorizer name are exposed as environment variables

## Authentication

The authentication Lambda function is responsible for authorizing clients to connect to the PubSub API. It receives a token from the client and returns an authorization decision:

```typescript
export default async function(event: {
  token: string;
  signatureVerified: boolean;
  protocols: string[];
  protocolData: {
    mqtt: {
      username: string;
    };
  };
  connectionMetadata: {
    id: string;
  };
}) {
  // Validate the token
  const user = validateToken(event.token);

  if (!user) {
    throw new Error('Unauthorized');
  }

  // Return authorization policy
  return {
    isAuthenticated: true,
    principalId: user.id,
    disconnectAfterInSeconds: 86400, // 24 hours
    refreshAfterInSeconds: 300, // 5 minutes
    policyDocuments: [
      {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'iot:Connect',
            Effect: 'Allow',
            Resource: '*'
          },
          {
            Action: 'iot:Subscribe',
            Effect: 'Allow',
            Resource: `arn:aws:iot:${process.env.AWS_REGION}:${process.env.AWS_ACCOUNT_ID}:topicfilter/user/${user.id}/*`
          },
          {
            Action: 'iot:Receive',
            Effect: 'Allow',
            Resource: `arn:aws:iot:${process.env.AWS_REGION}:${process.env.AWS_ACCOUNT_ID}:topic/user/${user.id}/*`
          },
          {
            Action: 'iot:Publish',
            Effect: 'Allow',
            Resource: `arn:aws:iot:${process.env.AWS_REGION}:${process.env.AWS_ACCOUNT_ID}:topic/user/${user.id}/*`
          }
        ]
      }
    ]
  };
}
```

## Message Processing

The consumer Lambda function processes messages that match the SQL filter. It receives the message and metadata:

```typescript
export default async function(event: {
  sql: string;
  mqtt: {
    topic: string;
  };
  timestamp: number;
  // The message payload
  temperature: number;
  humidity: number;
  deviceId: string;
  // ... other message fields
}) {
  console.log(`Received message from topic ${event.mqtt.topic}`);
  console.log(`Temperature: ${event.temperature}, Humidity: ${event.humidity}`);

  // Process the message
  if (event.temperature > 30) {
    // Send an alert
    await sendAlert(event.deviceId, event.temperature);
  }
}
```

## SQL Filtering

The SQL statement allows you to filter messages based on topic patterns and message content. Some examples:

- `SELECT * FROM '${topic(user/+/status)}'`: Select all messages from topics matching `user/*/status`
- `SELECT * FROM '${topic(device/+/telemetry)}' WHERE temperature > 30`: Select messages with temperature > 30
- `SELECT deviceId, temperature, humidity FROM '${topic(device/+/telemetry)}'`: Select specific fields
- `SELECT * FROM '${topic(+/+/+)}' WHERE topic(3) = 'temperature'`: Filter based on topic segments

## Client Connection

Clients can connect to the PubSub API using the MQTT or WebSocket protocols:

### WebSocket Connection

```javascript
import { IoT } from 'aws-iot-device-sdk-v2';

// Get the endpoint and token
const endpoint = 'realtime.example.com';
const token = await getAuthToken();

// Create a WebSocket connection
const connection = new IoT.MqttClientConnection({
  hostName: endpoint,
  port: 443,
  protocol: 'wss',
  customAuth: {
    username: 'any-username',
    password: token
  }
});

// Connect to the PubSub API
await connection.connect();

// Subscribe to a topic
await connection.subscribe('user/123/status', IoT.QoS.AtLeastOnce, (topic, payload) => {
  const message = JSON.parse(new TextDecoder().decode(payload));
  console.log(`Received message on ${topic}:`, message);
});

// Publish a message
await connection.publish('user/123/status', JSON.stringify({ status: 'online' }), IoT.QoS.AtLeastOnce);
```

## Custom Domains

You can configure your PubSub API to use a custom domain by specifying the `domain` and `subDomain` properties in the global PubSub API definition. The domain must be defined in your app configuration and have a valid SSL certificate.

For example, if you specify:

```json
{
  "domain": "example-domain",
  "subDomain": "realtime"
}
```

Your PubSub API will be available at `wss://realtime.example.com`.

## Environment Variables

For each PubSub API, Awsless automatically sets the following environment variables:

```
PUBSUB_APINAME_ENDPOINT=realtime.example.com
PUBSUB_APINAME_AUTHORIZER=app-name--pubsub--api-name
```

You can use these environment variables in your application code to connect to the PubSub API.

## Best Practices

When using the PubSub feature, consider these best practices:

1. **Use Hierarchical Topic Structures**: Organize topics in a hierarchical structure (e.g., `user/{userId}/status`)
2. **Implement Fine-Grained Access Control**: Restrict clients to only the topics they need
3. **Use Efficient SQL Filters**: Write efficient SQL filters to reduce processing overhead
4. **Handle Message Ordering**: Remember that message order is not guaranteed
5. **Implement Error Handling**: Handle errors in your consumer functions
6. **Monitor Message Flow**: Set up monitoring for message throughput and errors
7. **Optimize Message Size**: Keep messages small to reduce bandwidth usage

## Integration with Other Features

The PubSub feature integrates seamlessly with other Awsless features:

- **Function**: Lambda functions process PubSub messages
- **Domain**: Custom domains can be used for PubSub APIs
- **Auth**: Authentication can be integrated with PubSub APIs
- **Table**: DynamoDB tables can store message data
- **Queue**: SQS queues can be used for message buffering
- **Topic**: SNS topics can be used for fan-out messaging
