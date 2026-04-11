# Queue Feature

The Queue feature in Awsless provides a streamlined way to define, configure, and use Amazon SQS queues with consumer Lambda functions. It handles the complex aspects of queue setup including event source mappings, IAM permissions, and dead letter queues.

## Overview

Amazon SQS (Simple Queue Service) is a fully managed message queuing service that enables you to decouple and scale microservices, distributed systems, and serverless applications. The Queue feature in Awsless makes it easy to:

- Define SQS queues with consumer Lambda functions
- Configure all aspects of queues through a simple schema
- Set up proper IAM permissions automatically
- Configure dead letter queues for failed message handling
- Provide type-safe queue operations from other parts of your application

## Schema

The Queue feature uses a comprehensive schema to define queues with sensible defaults:

### Basic Usage

The simplest way to define a queue is by providing a file path to the consumer function:

```json
{
  "queues": {
    "notifications": "./src/notification-consumer.ts"
  }
}
```

### Advanced Configuration

For more control, you can use the full configuration object:

```json
{
  "queues": {
    "notifications": {
      "consumer": {
        "code": {
          "file": "./src/notification-consumer.ts",
          "minify": true,
          "external": ["aws-sdk"]
        },
        "memorySize": "512 MB",
        "timeout": "30 seconds"
      },
      "retentionPeriod": "7 days",
      "visibilityTimeout": "30 seconds",
      "deliveryDelay": "0 seconds",
      "maxMessageSize": "256 KB",
      "batchSize": 10,
      "maxConcurrency": 5,
      "maxBatchingWindow": "1 minute"
    }
  }
}
```

### Schema Properties

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `consumer` | Object/String | The Lambda function configuration or file path | Required |
| `retentionPeriod` | String | How long messages are kept in the queue | `7 days` |
| `visibilityTimeout` | String | How long a message is invisible after being received | `30 seconds` |
| `deliveryDelay` | String | Delay before a message is delivered | `0 seconds` |
| `receiveMessageWaitTime` | String | How long to wait for messages when polling | - |
| `maxMessageSize` | String | Maximum size of a message | `256 KB` |
| `batchSize` | Number | Number of messages to process in a batch | `10` |
| `maxConcurrency` | Number | Maximum number of concurrent Lambda invocations | - |
| `maxBatchingWindow` | String | Maximum time to gather messages before invoking Lambda | - |

The `consumer` property accepts all the same configuration options as the Function feature. For detailed information about these options, please refer to the [Function documentation](Function.md).

## How Queues Work

When you define a queue in Awsless:

1. An SQS queue is created with your specified configuration
2. A Lambda function is created to consume messages from the queue
3. An event source mapping is set up to connect the queue to the Lambda function
4. IAM permissions are automatically configured for the Lambda to access the queue
5. Dead letter queue configuration is set up for failed message handling

When you send a message to the queue:

1. The message is stored in the SQS queue
2. The Lambda function is automatically triggered to process the message(s)
3. If the Lambda function successfully processes the message, it is removed from the queue
4. If the Lambda function fails to process the message, it becomes visible again after the visibility timeout
5. After multiple failed attempts, the message can be sent to a dead letter queue

## Type-Safe Queue Operations

One of the key benefits of the Queue feature is type-safe operations from other parts of your application. When you run `pnpm awsless dev`, Awsless generates TypeScript definitions for all your queues, allowing you to send messages with full type safety:

```typescript
import { Queue } from '@awsless/awsless'

// Send a single message
await Queue.myStack.notifications.send({
  userId: '123',
  message: 'Hello, world!'
})

// Send a batch of messages
await Queue.myStack.notifications.batch([
  { payload: { userId: '123', message: 'Hello, world!' } },
  { payload: { userId: '456', message: 'Hello, again!' } }
])
```

The message payload is fully typed based on the parameters expected by your consumer function, providing compile-time safety.

## Consumer Function

The consumer function receives batches of messages from the queue. The function signature looks like this:

```typescript
export default async function(event: {
  Records: Array<{
    messageId: string;
    receiptHandle: string;
    body: any; // Your message payload
    attributes: Record<string, any>;
    messageAttributes: Record<string, any>;
    md5OfBody: string;
    eventSource: string;
    eventSourceARN: string;
    awsRegion: string;
  }>
}) {
  // Process messages
  for (const record of event.Records) {
    const payload = JSON.parse(record.body);
    // Handle the message
  }
}
```

## Best Practices

When using queues, consider these best practices:

1. **Set Appropriate Timeouts**: Configure visibility timeouts based on how long your consumer function needs to process messages
2. **Use Batch Processing**: Process messages in batches when possible for better throughput
3. **Handle Idempotency**: Design your consumer functions to be idempotent (can safely process the same message multiple times)
4. **Monitor Queue Metrics**: Watch for queue depth, age of oldest message, and processing errors
5. **Configure Dead Letter Queues**: Use the global on-failure handler to capture messages that can't be processed
6. **Optimize Message Size**: Keep messages small and consider storing large data in S3 and including the reference in the message

## Integration with Other Features

The Queue feature integrates seamlessly with other Awsless features:

- **Function**: Queues use Lambda functions as consumers
- **On-Failure**: Failed messages can be sent to the global on-failure handler
- **Task**: Tasks can send messages to queues
- **Topic**: Topics can publish messages to queues
