# On-Failure Feature

The On-Failure feature in Awsless provides a streamlined way to handle failures across multiple asynchronous operations in your application. It creates a centralized error handling mechanism that captures and processes failures from various sources.

## Overview

Error handling is a critical aspect of robust applications. The On-Failure feature in Awsless makes it easy to:

- Define a global error handler for asynchronous operations
- Capture failures from multiple sources in a single place
- Process and respond to errors consistently
- Implement retry logic, alerting, or logging for failures
- Improve the reliability and observability of your application

## Schema

The On-Failure feature uses a simple schema to define a global error handler in your application's base configuration:

```json
{
  "defaults": {
    "onFailure": "./src/handlers/on-failure.ts"
  }
}
```

You can also use the full Lambda function configuration:

```json
{
  "defaults": {
    "onFailure": {
      "code": {
        "file": "./src/handlers/on-failure.ts",
        "minify": true
      },
      "memorySize": "256 MB",
      "timeout": "30 seconds",
      "environment": {
        "ALERT_EMAIL": "alerts@example.com"
      }
    }
  }
}
```

## How On-Failure Works

When you define an On-Failure handler in Awsless:

1. An SQS queue is created to capture failure events
2. A Lambda function is set up to process messages from the queue
3. Asynchronous operations are configured to send failures to the queue
4. The Lambda function processes the failures and takes appropriate actions

The On-Failure handler automatically captures failures from:

- Asynchronous Lambda functions
- SQS queue consumers
- DynamoDB streams

## Failure Handler

The On-Failure handler is a Lambda function that processes failure events. It receives a batch of failure records from the SQS queue:

```typescript
export default async function(event: {
  Records: Array<{
    messageId: string;
    receiptHandle: string;
    body: string;
    attributes: {
      ApproximateReceiveCount: string;
      SentTimestamp: string;
      SenderId: string;
      ApproximateFirstReceiveTimestamp: string;
    };
    messageAttributes: Record<string, {
      stringValue: string;
      binaryValue: string;
      stringListValues: string[];
      binaryListValues: string[];
      dataType: string;
    }>;
    md5OfBody: string;
    eventSource: string;
    eventSourceARN: string;
    awsRegion: string;
  }>;
}) {
  // Process each failure record
  for (const record of event.Records) {
    // Parse the failure details from the message body
    const failure = JSON.parse(record.body);

    // Extract information about the failure
    const { source, error, context } = failure;

    console.log(`Processing failure from ${source}:`, error);

    // Implement your error handling logic
    // For example:
    // - Log the error details
    // - Send alerts for critical errors
    // - Retry the operation if appropriate
    // - Store the error in a database for analysis

    switch (source) {
      case 'lambda':
        await handleLambdaFailure(failure);
        break;
      case 'sqs':
        await handleSQSFailure(failure);
        break;
      case 'dynamodb':
        await handleDynamoDBFailure(failure);
        break;
      default:
        console.log('Unknown failure source:', source);
    }
  }
}

async function handleLambdaFailure(failure) {
  const { functionName, error, event } = failure;
  console.log(`Lambda failure in ${functionName}:`, error);

  // Implement your Lambda failure handling logic
  // For example, send an alert for critical functions
  if (isCriticalFunction(functionName)) {
    await sendAlert(`Critical function ${functionName} failed: ${error.message}`);
  }
}

async function handleSQSFailure(failure) {
  const { queueName, error, messages } = failure;
  console.log(`SQS failure in ${queueName}:`, error);

  // Implement your SQS failure handling logic
}

async function handleDynamoDBFailure(failure) {
  const { tableName, error, records } = failure;
  console.log(`DynamoDB failure in ${tableName}:`, error);

  // Implement your DynamoDB failure handling logic
}

async function sendAlert(message) {
  // Implement your alerting logic
  // For example, send an email or a notification
}

function isCriticalFunction(functionName) {
  // Determine if a function is critical
  return functionName.includes('payment') || functionName.includes('auth');
}
```

## Failure Message Format

The failure messages sent to the On-Failure queue have different formats depending on the source:

### Lambda Failure

```json
{
  "source": "lambda",
  "functionName": "app-name--stack-name--function-name",
  "error": {
    "name": "Error",
    "message": "Something went wrong",
    "stack": "Error: Something went wrong\n    at ..."
  },
  "event": {
    // The original event that triggered the Lambda
  },
  "context": {
    "awsRequestId": "request-id",
    "functionName": "function-name",
    "functionVersion": "$LATEST",
    "invokedFunctionArn": "arn:aws:lambda:region:account:function:function-name"
  }
}
```

### SQS Failure

```json
{
  "source": "sqs",
  "queueName": "app-name--stack-name--queue-name",
  "error": {
    "name": "Error",
    "message": "Failed to process SQS message",
    "stack": "Error: Failed to process SQS message\n    at ..."
  },
  "messages": [
    // The SQS messages that failed to process
  ]
}
```

### DynamoDB Failure

```json
{
  "source": "dynamodb",
  "tableName": "app-name--stack-name--table-name",
  "error": {
    "name": "Error",
    "message": "Failed to process DynamoDB stream",
    "stack": "Error: Failed to process DynamoDB stream\n    at ..."
  },
  "records": [
    // The DynamoDB stream records that failed to process
  ]
}
```

## Best Practices

When using the On-Failure feature, consider these best practices:

1. **Implement Comprehensive Error Handling**: Handle all types of failures in your On-Failure handler
2. **Categorize Errors**: Categorize errors by severity and source to prioritize handling
3. **Implement Alerting**: Set up alerts for critical errors that require immediate attention
4. **Log Error Details**: Log detailed error information for debugging and analysis
5. **Consider Retry Strategies**: Implement appropriate retry strategies for different types of failures
6. **Monitor Failure Rates**: Set up monitoring for failure rates to detect patterns
7. **Analyze Root Causes**: Use failure data to identify and address root causes

## Integration with Other Features

The On-Failure feature integrates seamlessly with other Awsless features:

- **Function**: Captures failures from asynchronous Lambda functions
- **Queue**: Captures failures from SQS queue consumers
- **Table**: Captures failures from DynamoDB streams
- **Alert**: Can be used to send alerts for critical failures
- **Config**: Can use configuration values for error handling logic
