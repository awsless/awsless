# Cron Feature

The Cron feature in Awsless provides a streamlined way to define, configure, and use scheduled tasks using AWS EventBridge. It handles the complex aspects of setting up scheduled events including Lambda function integration and IAM permissions.

## Overview

AWS EventBridge (formerly CloudWatch Events) allows you to create scheduled tasks that run at specified intervals. The Cron feature in Awsless makes it easy to:

- Define scheduled tasks with simple or complex schedules
- Configure Lambda functions to execute on schedule
- Pass custom payloads to your scheduled functions
- Enable or disable schedules as needed
- Set up proper IAM permissions automatically

## Schema

The Cron feature uses a simple schema to define scheduled tasks:

### Basic Usage

The simplest way to define a cron job is by providing a schedule and a consumer function:

```json
{
  "crons": {
    "dailyCleanup": {
      "schedule": "1 day",
      "consumer": "./src/cleanup-handler.ts"
    }
  }
}
```

### Advanced Configuration

For more control, you can use the full configuration object:

```json
{
  "crons": {
    "weeklyReport": {
      "schedule": "cron(0 9 ? * MON *)",
      "consumer": {
        "code": {
          "file": "./src/report-generator.ts",
          "minify": true,
          "external": ["aws-sdk"]
        },
        "memorySize": "512 MB",
        "timeout": "2 minutes"
      },
      "enabled": true,
      "payload": {
        "reportType": "weekly",
        "sendEmail": true
      }
    }
  }
}
```

### Schema Properties

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `schedule` | String | Schedule expression (rate or cron) | Required |
| `consumer` | Object/String | Lambda function configuration or file path | Required |
| `enabled` | Boolean | Whether the schedule is enabled | `true` |
| `payload` | Object | JSON payload to pass to the Lambda function | - |

The `consumer` property accepts all the same configuration options as the Function feature. For detailed information about these options, please refer to the [Function documentation](Function.md).

## Schedule Expressions

The `schedule` property supports two types of expressions:

### Rate Expressions

Rate expressions are simpler and specify how frequently the task runs:

```
"schedule": "5 minutes"
"schedule": "1 hour"
"schedule": "7 days"
```

Rate expressions follow the format: `{number} {unit}` where unit can be `second(s)`, `minute(s)`, `hour(s)`, or `day(s)`.

### Cron Expressions

Cron expressions provide more complex scheduling options using the AWS cron syntax:

```
"schedule": "cron(0 12 * * ? *)"  // Run at 12:00 PM (UTC) every day
"schedule": "cron(0 9 ? * MON *)"  // Run at 9:00 AM (UTC) every Monday
"schedule": "cron(0 0/4 * * ? *)"  // Run every 4 hours
```

AWS cron expressions have six required fields:

```
cron(minutes hours day-of-month month day-of-week year)
```

## How Crons Work

When you define a cron in Awsless:

1. An EventBridge rule is created with your specified schedule
2. A Lambda function is created to execute when the schedule triggers
3. A target is configured to connect the rule to the Lambda function
4. IAM permissions are automatically set up to allow EventBridge to invoke the Lambda
5. If provided, a custom payload is passed to the Lambda function when invoked

## Consumer Function

The consumer function is invoked according to the schedule. If a payload is specified, it will be passed to the function:

```typescript
export default async function(event: any) {
  // If a payload was specified, it will be available in the event object
  const { reportType, sendEmail } = event;

  // Perform scheduled task
  // ...
}
```

## Best Practices

When using crons, consider these best practices:

1. **Use Appropriate Schedules**: Choose schedules that align with your business needs while minimizing costs
2. **Handle Idempotency**: Design your consumer functions to be idempotent (can safely run multiple times)
3. **Set Reasonable Timeouts**: Configure timeouts based on the expected execution time
4. **Monitor Execution**: Use CloudWatch to monitor execution times and failures
5. **Consider Time Zones**: Remember that cron expressions use UTC time
6. **Disable Unused Crons**: Use the `enabled` property to disable crons that are not currently needed
7. **Use Payloads for Configuration**: Pass configuration data via the payload rather than hardcoding it

## Integration with Other Features

The Cron feature integrates seamlessly with other Awsless features:

- **Function**: Crons use Lambda functions as consumers
- **Task**: Crons can trigger tasks for background processing
- **Queue**: Crons can send messages to queues
- **Topic**: Crons can publish messages to topics
- **Table**: Crons can perform scheduled operations on tables
