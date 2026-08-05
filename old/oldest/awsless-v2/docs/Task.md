# Task Feature

The Task feature in Awsless provides a way to define and execute asynchronous background processes using AWS Lambda. Tasks are designed for fire-and-forget operations where you can trigger a task and immediately move on while Awsless handles the execution in the background, including retries and logging on failure.

## Overview

Tasks in Awsless are specialized Lambda functions optimized for background processing. They provide:

- Asynchronous execution - trigger and forget
- Automatic retry handling
- Error logging and monitoring
- Type-safe invocation from other parts of your application
- Integration with the global on-failure handler

Tasks are perfect for operations that:
- Don't need an immediate response
- Can be processed in the background
- May take longer to complete
- Need reliable execution with retry capabilities

## Schema

The Task feature uses a schema that builds on top of the Function feature:

### Basic Usage

The simplest way to define a task is by providing a file path:

```json
{
  "tasks": {
    "processOrder": "./src/process-order.ts"
  }
}
```

### Advanced Configuration

For more control, you can use the full configuration object:

```json
{
  "tasks": {
    "processOrder": {
      "consumer": {
        "code": {
          "file": "./src/process-order.ts",
          "minify": true,
          "external": ["aws-sdk"]
        },
        "memorySize": "512 MB",
        "timeout": "2 minutes",
        "environment": {
          "PAYMENT_API_KEY": "your-api-key"
        }
      },
      "retryAttempts": 2
    }
  }
}
```

### Schema Properties

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `consumer` | Object/String | The Lambda function configuration or file path | Required |
| `retryAttempts` | Number | Number of retry attempts (0-2) | `2` |

The `consumer` property accepts all the same configuration options as the Function feature. For detailed information about these options, please refer to the [Function documentation](Function.md).

## How Tasks Work

When you invoke a task:

1. The task is queued for asynchronous execution
2. Your code continues execution immediately without waiting
3. AWS Lambda executes the task in the background
4. If the task fails, it will be retried according to the `retryAttempts` configuration
5. If all retries fail, the error is logged and optionally sent to the global on-failure handler

This makes tasks ideal for operations like:
- Sending emails
- Processing uploads
- Generating reports
- Syncing data
- Cleanup operations
- Long-running calculations

## Type-Safe Invocation

One of the key benefits of the Task feature is type-safe invocation from other parts of your application. When you run `pnpm awsless dev`, Awsless generates TypeScript definitions for all your tasks, allowing you to invoke them with full type safety:

```typescript
import { Task } from '@awsless/awsless'

// Invoke a task with proper type checking
await Task.myStack.processOrder({
  orderId: '123',
  customerId: '456',
  items: [
    { productId: 'abc', quantity: 2 }
  ]
})
```

The invocation is fully typed based on the parameters and return type of your task function, providing compile-time safety.

## Differences from Regular Functions

While tasks are built on top of Lambda functions, they have some key differences:

1. **Asynchronous Execution**: Tasks are always invoked asynchronously
2. **No Return Value**: Tasks don't return values to the caller
3. **Automatic Retry**: Tasks have built-in retry logic
4. **Error Handling**: Failed tasks are automatically logged and can trigger the global on-failure handler
5. **Optimized for Background Work**: Tasks are designed for operations that don't need immediate responses

## Best Practices

When using tasks, consider these best practices:

1. **Keep Tasks Focused**: Each task should do one thing well
2. **Handle Idempotency**: Design tasks to be idempotent (can be safely retried)
3. **Include Sufficient Context**: Pass all necessary data in the task payload
4. **Set Appropriate Timeouts**: Configure timeouts based on the expected execution time
5. **Monitor Task Execution**: Use CloudWatch to monitor task execution and failures
6. **Consider DLQs**: For critical tasks, configure a Dead Letter Queue using the global on-failure handler

## Integration with Other Features

The Task feature integrates seamlessly with other Awsless features:

- **Function**: Tasks are built on top of the Function feature
- **On-Failure**: Failed tasks can be sent to the global on-failure handler
- **Queue**: Tasks can process messages from queues
- **Topic**: Tasks can subscribe to topics
- **Cron**: Tasks can be scheduled using crons
