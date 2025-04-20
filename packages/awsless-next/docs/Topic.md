# Topic Feature

The Topic feature in Awsless provides a streamlined way to define, configure, and use Amazon SNS topics with subscriber Lambda functions. It handles the complex aspects of topic setup including subscriptions, IAM permissions, and message publishing.

## Overview

Amazon SNS (Simple Notification Service) is a fully managed messaging service for both application-to-application (A2A) and application-to-person (A2P) communication. The Topic feature in Awsless makes it easy to:

- Define SNS topics for publishing events
- Create Lambda function subscribers to process events
- Set up proper IAM permissions automatically
- Provide type-safe topic operations from other parts of your application
- Implement the publish-subscribe pattern for event-driven architectures

## Schema

The Topic feature uses a simple schema to define topics and their subscribers:

### Basic Usage

To define topics that you can publish to:

```json
{
  "topics": ["transaction", "notification", "audit"]
}
```

To define subscribers that process messages from topics:

```json
{
  "subscribers": {
    "transaction": "./src/transaction-handler.ts",
    "notification": "./src/notification-handler.ts"
  }
}
```

### Advanced Configuration

For more control over the subscriber functions, you can use the full configuration object:

```json
{
  "subscribers": {
    "transaction": {
      "code": {
        "file": "./src/transaction-handler.ts",
        "minify": true,
        "external": ["aws-sdk"]
      },
      "memorySize": "512 MB",
      "timeout": "30 seconds"
    }
  }
}
```

### Schema Properties

#### Topics

The `topics` property is an array of strings, where each string is a unique topic name. Topic names must:
- Be between 3 and 256 characters
- Contain only alphanumeric characters and hyphens
- Be unique across all stacks in your application

#### Subscribers

The `subscribers` property is an object mapping topic names to Lambda function configurations. Each subscriber can be:
- A string path to a Lambda function file
- A full Lambda function configuration object

The subscriber function configuration accepts all the same options as the Function feature. For detailed information about these options, please refer to the [Function documentation](Function.md).

## How Topics Work

When you define topics and subscribers in Awsless:

1. SNS topics are created at the application level (they are global resources)
2. Lambda functions are created for each subscriber
3. Subscriptions are set up to connect the topics to the Lambda functions
4. IAM permissions are automatically configured for publishing and subscribing

When you publish a message to a topic:

1. The message is sent to the SNS topic
2. SNS delivers the message to all subscribed Lambda functions
3. Each Lambda function processes the message independently
4. If a Lambda function fails to process the message, it can be retried based on the function's configuration

## Type-Safe Topic Operations

One of the key benefits of the Topic feature is type-safe operations from other parts of your application. When you run `pnpm awsless dev`, Awsless generates TypeScript definitions for all your topics, allowing you to publish messages with full type safety:

```typescript
import { Topic } from '@awsless/awsless'

// Publish a message to a topic
await Topic.transaction.credit({
  amount: 10,
  userId: "test",
  timestamp: new Date().toISOString()
})
```

## Subscriber Function

The subscriber function receives messages from the topic. The function signature looks like this:

```typescript
export default async function(event: {
  Records: Array<{
    EventSource: string;
    EventVersion: string;
    EventSubscriptionArn: string;
    Sns: {
      Type: string;
      MessageId: string;
      TopicArn: string;
      Subject?: string;
      Message: string; // Your message payload (JSON string)
      Timestamp: string;
      SignatureVersion: string;
      Signature: string;
      SigningCertUrl: string;
      UnsubscribeUrl: string;
      MessageAttributes: Record<string, any>;
    }
  }>
}) {
  // Process messages
  for (const record of event.Records) {
    const payload = JSON.parse(record.Sns.Message);
    // Handle the message
  }
}
```

## Best Practices

When using topics, consider these best practices:

1. **Use Topics for Fan-Out**: Topics are ideal for scenarios where one event needs to trigger multiple independent processes
2. **Keep Messages Small**: Keep message payloads small and consider storing large data in S3 and including the reference in the message
3. **Use Meaningful Topic Names**: Choose descriptive names that reflect the event type or domain
4. **Handle Idempotency**: Design your subscriber functions to be idempotent (can safely process the same message multiple times)
5. **Add Message Attributes**: Use message attributes for filtering and routing when needed
6. **Monitor Topic Metrics**: Watch for failed deliveries and subscriber errors

## Integration with Other Features

The Topic feature integrates seamlessly with other Awsless features:

- **Function**: Topics use Lambda functions as subscribers
- **Queue**: Topics can publish to SQS queues (using SNS to SQS subscriptions)
- **Task**: Tasks can publish messages to topics
- **Cron**: Scheduled events can trigger topic publications
