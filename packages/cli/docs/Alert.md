# Alert Feature

The Alert feature in Awsless provides a streamlined way to define, configure, and send alerts using Amazon SNS. It handles the complex aspects of alert setup including topic creation, email subscriptions, and type-safe alert sending from your application code.

## Overview

Alerting is essential for monitoring and responding to important events in your application. The Alert feature in Awsless makes it easy to:

- Define alert topics with email subscribers
- Send alerts with custom subjects and payloads
- Use type-safe alert sending from your application code
- Configure different alert destinations for different purposes

## Schema

The Alert feature uses a simple schema to define alerts in your application's base configuration:

### Basic Usage

The simplest way to define an alert is with a single email recipient:

```json
{
  "defaults": {
    "alerts": {
      "critical": "admin@example.com"
    }
  }
}
```

### Multiple Recipients

For alerts that should go to multiple recipients:

```json
{
  "defaults": {
    "alerts": {
      "critical": ["admin@example.com", "oncall@example.com"],
      "debug": "developer@example.com",
      "billing": "finance@example.com"
    }
  }
}
```

### Schema Properties

Each alert is defined with a name (key) and one or more email addresses (value). The alert names should follow these rules:

- Use only lowercase letters, numbers, and hyphens
- Choose descriptive names that reflect the purpose of the alert
- Use consistent naming conventions across your application

## How Alerts Work

When you define alerts in Awsless:

1. An SNS topic is created for each alert
2. Email subscriptions are created for each recipient
3. IAM permissions are set up to allow Lambda functions to publish to the topics
4. Type definitions are generated for type-safe alert sending from your application code

When you send an alert:

1. A message is published to the SNS topic
2. SNS delivers the message to all subscribed email addresses
3. Recipients receive an email with the subject and payload you specified

## Sending Alerts

You can send alerts from your application code using the type-safe `Alert` object:

```typescript
import { Alert } from '@awsless/awsless'

// Send a simple alert
await Alert.critical('System Failure', 'The database connection has been lost')

// Send an alert with a structured payload
await Alert.debug('Performance Warning', {
  service: 'payment-processor',
  latency: 2500,
  threshold: 1000,
  timestamp: new Date().toISOString()
})

// Send an alert with options
await Alert.billing('Monthly Usage Exceeded', {
  usage: 1250,
  limit: 1000,
  overage: 250
}, {
  messageAttributes: {
    priority: {
      DataType: 'String',
      StringValue: 'high'
    }
  }
})
```

## Email Subscription Confirmation

When you deploy an alert for the first time, AWS SNS sends a confirmation email to each recipient. Recipients must click the confirmation link in the email to start receiving alerts. This is a security measure to prevent unwanted emails.

If a recipient doesn't receive alerts, check if they've confirmed their subscription. You can also check the subscription status in the AWS SNS console.

## Testing Alerts

You can test alerts by sending a test message:

```typescript
import { Alert } from '@awsless/awsless'

// Send a test alert
await Alert.critical('Test Alert', 'This is a test alert')
```

## Mocking Alerts in Tests

When writing tests, you can mock alerts to verify that they're sent correctly:

```typescript
import { AlertMock } from '@awsless/awsless'

// Mock the critical alert
let criticalAlertPayload: any
AlertMock.critical((payload) => {
  criticalAlertPayload = payload
})

// Call the function that should send an alert
await myFunction()

// Verify that the alert was sent with the expected payload
expect(criticalAlertPayload).toEqual({
  service: 'payment-processor',
  error: 'Connection timeout'
})
```

## Best Practices

When using the Alert feature, consider these best practices:

1. **Use Different Alerts for Different Purposes**: Create separate alerts for different types of events (critical errors, warnings, billing notifications, etc.)
2. **Include Relevant Information**: Include all relevant information in the alert payload to help recipients understand and respond to the alert
3. **Use Descriptive Subjects**: Make alert subjects clear and descriptive to help recipients quickly understand the nature of the alert
4. **Avoid Alert Fatigue**: Only send alerts for events that require human attention
5. **Include Actionable Information**: Include information about what action should be taken in response to the alert
6. **Consider Time Zones**: Remember that recipients may be in different time zones when sending alerts

## Integration with Other Features

The Alert feature integrates seamlessly with other Awsless features:

- **Function**: Lambda functions can send alerts
- **Task**: Tasks can send alerts on failure
- **Queue**: Queue consumers can send alerts on processing errors
- **Topic**: Topic subscribers can send alerts on message processing errors
- **Cron**: Cron jobs can send alerts on execution failures
- **On-failure**: Failed operations can automatically trigger alerts
