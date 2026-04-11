# On-Log Feature

The On-Log feature in Awsless provides a streamlined way to monitor and process logs from all Lambda functions in your application. It creates a centralized log processing mechanism that captures and handles logs based on their severity level.

## Overview

Log monitoring is essential for application observability. The On-Log feature in Awsless makes it easy to:

- Define a global log handler for all Lambda functions
- Filter logs based on severity levels
- Process logs in a centralized location
- Implement alerting, analytics, or custom log handling
- Improve the observability and monitoring of your application

## Schema

The On-Log feature uses a simple schema to define a global log handler in your application's base configuration:

### Basic Usage

The simplest way to define a log handler is with default settings (capturing error and fatal logs):

```json
{
  "defaults": {
    "onLog": "./src/handlers/on-log.ts"
  }
}
```

### Advanced Configuration

For more control, you can specify which log levels to capture:

```json
{
  "defaults": {
    "onLog": {
      "consumer": {
        "code": {
          "file": "./src/handlers/on-log.ts",
          "minify": true
        },
        "memorySize": "256 MB",
        "timeout": "30 seconds"
      },
      "filter": ["warn", "error", "fatal"]
    }
  }
}
```

### Schema Properties

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `consumer` | Object/String | Lambda function for processing logs | Required |
| `filter` | String[] | Log levels to capture | `["error", "fatal"]` |

#### Available Log Levels

The `filter` property can include any of the following log levels, in order of increasing severity:

- `trace`: Detailed debugging information
- `debug`: Debugging information
- `info`: Informational messages
- `warn`: Warning messages
- `error`: Error messages
- `fatal`: Critical errors that cause the application to crash

## How On-Log Works

When you define an On-Log handler in Awsless:

1. A Lambda function is created to process logs
2. CloudWatch Logs subscriptions are set up for all Lambda functions in your application
3. Logs matching the specified filter levels are sent to your log handler
4. The log handler processes the logs and takes appropriate actions

## Log Handler

The log handler is a Lambda function that processes log events. It receives batches of log events from CloudWatch Logs:

```typescript
export default async function(event: {
  awslogs: {
    data: string;
  };
}) {
  // The log data is base64 encoded and gzipped
  const payload = Buffer.from(event.awslogs.data, 'base64');
  const zlib = require('zlib');
  const parsed = JSON.parse(zlib.unzipSync(payload).toString());

  // Extract log information
  const {
    logGroup,      // e.g., "/aws/lambda/app-name--stack-name--function-name"
    logStream,     // e.g., "2023/03/25/[$LATEST]abcdef123456"
    logEvents,     // Array of log events
    subscriptionFilters // Array of subscription filter names
  } = parsed;

  // Extract function name from log group
  const functionName = logGroup.replace('/aws/lambda/', '');

  // Process each log event
  for (const logEvent of logEvents) {
    const { id, timestamp, message } = logEvent;

    try {
      // Try to parse the log message as JSON
      const parsedMessage = JSON.parse(message);

      // Check if this is a structured log message
      if (parsedMessage.level && parsedMessage.message) {
        // This is a structured log message
        const { level, message, ...context } = parsedMessage;

        console.log(`[${level}] ${functionName}: ${message}`);

        // Implement your log handling logic based on level
        switch (level) {
          case 'error':
          case 'fatal':
            await handleErrorLog(functionName, parsedMessage);
            break;
          case 'warn':
            await handleWarningLog(functionName, parsedMessage);
            break;
          default:
            // Handle other log levels
        }
      } else {
        // This is not a structured log message
        console.log(`${functionName}: ${message}`);
      }
    } catch (error) {
      // Not a JSON message, handle as plain text
      console.log(`${functionName}: ${message}`);
    }
  }
}

async function handleErrorLog(functionName, log) {
  // Implement your error log handling logic
  // For example, send an alert for critical errors
  if (log.level === 'fatal' || isCriticalFunction(functionName)) {
    await sendAlert(`Critical error in ${functionName}: ${log.message}`);
  }

  // Store error logs for analysis
  await storeErrorLog(functionName, log);
}

async function handleWarningLog(functionName, log) {
  // Implement your warning log handling logic
  // For example, track warning frequency
  await trackWarning(functionName, log);
}

async function sendAlert(message) {
  // Implement your alerting logic
  // For example, send an email or a notification
}

async function storeErrorLog(functionName, log) {
  // Implement your log storage logic
  // For example, store in DynamoDB for analysis
}

async function trackWarning(functionName, log) {
  // Implement your warning tracking logic
  // For example, increment a counter in CloudWatch
}

function isCriticalFunction(functionName) {
  // Determine if a function is critical
  return functionName.includes('payment') || functionName.includes('auth');
}
```

## Structured Logging

To get the most out of the On-Log feature, use structured logging in your Lambda functions. This makes it easier to filter and process logs based on their content:

```typescript
// In your Lambda function
import { Logger } from '@awsless/logger';

const logger = new Logger();

export default async function(event) {
  // Log at different levels
  logger.trace('Detailed debugging information', { event });
  logger.debug('Debugging information', { userId: event.userId });
  logger.info('Processing request', { requestId: event.requestId });
  logger.warn('Unusual condition detected', { condition: 'rate limit approaching' });

  try {
    // Your function logic
    const result = await processRequest(event);
    return result;
  } catch (error) {
    // Log errors
    logger.error('Failed to process request', { error, event });
    throw error;
  }
}
```

## Best Practices

When using the On-Log feature, consider these best practices:

1. **Use Structured Logging**: Use a structured logging library to include context with your logs
2. **Filter Appropriately**: Only capture the log levels you need to avoid excessive processing
3. **Include Context**: Include relevant context in your logs to aid debugging
4. **Implement Alerting**: Set up alerts for critical errors that require immediate attention
5. **Analyze Log Patterns**: Use logs to identify patterns and trends in your application
6. **Monitor Log Volume**: Watch for unusual increases in log volume that might indicate issues
7. **Respect Privacy**: Be careful not to log sensitive information like passwords or personal data

## Integration with Other Features

The On-Log feature integrates seamlessly with other Awsless features:

- **Function**: Captures logs from all Lambda functions
- **Alert**: Can be used to send alerts for critical logs
- **Table**: Can store logs for analysis and reporting
- **OnFailure**: Complements the On-Failure feature for comprehensive error handling
