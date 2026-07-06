# Table Feature

The Table feature in Awsless provides a streamlined way to define, configure, and use Amazon DynamoDB tables. It handles the complex aspects of table setup including indexes, streams, and IAM permissions.

## Overview

Amazon DynamoDB is a fully managed NoSQL database service that provides fast and predictable performance with seamless scalability. The Table feature in Awsless makes it easy to:

- Define DynamoDB tables with primary keys and indexes
- Configure table properties like class and point-in-time recovery
- Set up DynamoDB streams with Lambda consumers
- Configure TTL (Time to Live) for automatic item expiration
- Set up proper IAM permissions automatically
- Provide type-safe table names from other parts of your application

## Schema

The Table feature uses a comprehensive schema to define tables with sensible defaults:

### Basic Usage

The simplest way to define a table is by specifying the hash key (partition key):

```json
{
  "tables": {
    "users": {
      "hash": "id"
    }
  }
}
```

### Advanced Configuration

For more control, you can use the full configuration object:

```json
{
  "tables": {
    "users": {
      "hash": "id",
      "sort": "email",
      "fields": {
        "id": "string",
        "email": "string",
        "age": "number",
        "profilePicture": "binary"
      },
      "class": "standard",
      "pointInTimeRecovery": true,
      "timeToLiveAttribute": "expiresAt",
      "deletionProtection": true,
      "stream": {
        "type": "new-and-old-images",
        "consumer": "./src/user-stream-handler.ts"
      },
      "indexes": {
        "byEmail": {
          "hash": "email",
          "projection": "all"
        },
        "byAgeAndId": {
          "hash": "age",
          "sort": "id",
          "projection": "keys-only"
        }
      }
    }
  }
}
```

### Schema Properties

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `hash` | String | Partition key attribute name | Required |
| `sort` | String | Sort key attribute name | - |
| `fields` | Object | Attribute definitions (string, number, binary) | All string |
| `class` | String | Table class (standard, standard-infrequent-access) | `standard` |
| `pointInTimeRecovery` | Boolean | Enable point-in-time recovery | `false` |
| `timeToLiveAttribute` | String | Attribute name for TTL | - |
| `deletionProtection` | Boolean | Protect table from deletion | - |
| `stream` | Object | DynamoDB stream configuration | - |
| `stream.type` | String | Stream view type | Required if stream is defined |
| `stream.consumer` | Object/String | Lambda function for stream processing | Required if stream is defined |
| `indexes` | Object | Global secondary indexes | - |

#### Stream Types

The `stream.type` property can be one of:
- `keys-only` - Only the key attributes are written to the stream
- `new-image` - The entire item, as it appears after modification
- `old-image` - The entire item, as it appeared before modification
- `new-and-old-images` - Both the new and old item images

#### Index Configuration

Each index in the `indexes` object can have:
- `hash` - Partition key for the index (required)
- `sort` - Sort key for the index (optional)
- `projection` - What to project into the index (`all` or `keys-only`, default: `all`)

## How Tables Work

When you define a table in Awsless:

1. A DynamoDB table is created with your specified configuration
2. Global secondary indexes are created if specified
3. Streams are configured if specified, with a Lambda consumer
4. IAM permissions are automatically set up for accessing the table
5. Deletion protection is configured if specified

## Stream Processing

If you configure a stream for your table, you can process changes to the table in real-time. The stream consumer Lambda function receives events with the following structure:

```typescript
export default async function(event: {
  Records: Array<{
    eventID: string;
    eventName: 'INSERT' | 'MODIFY' | 'REMOVE';
    eventVersion: string;
    eventSource: string;
    awsRegion: string;
    dynamodb: {
      Keys: Record<string, any>;
      NewImage?: Record<string, any>;
      OldImage?: Record<string, any>;
      SequenceNumber: string;
      SizeBytes: number;
      StreamViewType: 'KEYS_ONLY' | 'NEW_IMAGE' | 'OLD_IMAGE' | 'NEW_AND_OLD_IMAGES';
    };
    eventSourceARN: string;
  }>
}) {
  // Process stream events
  for (const record of event.Records) {
    // Handle the record based on eventName (INSERT, MODIFY, REMOVE)
    // Access the data using record.dynamodb.Keys, NewImage, OldImage
  }
}
```

## Type-Safe Table Names

One of the benefits of the Table feature is type-safe table names from other parts of your application. When you run `pnpm awsless dev`, Awsless generates TypeScript definitions for all your tables, allowing you to reference them with full type safety:

```typescript
import { Table } from '@awsless/awsless'

// Get the table name for use with DynamoDB client
const usersTableName = Table.myStack.users
```

## Best Practices

When using tables, consider these best practices:

1. **Choose Keys Carefully**: Design your primary key and sort key to support your access patterns
2. **Use GSIs Wisely**: Create global secondary indexes only for the access patterns you need
3. **Consider Item Size**: Keep items small when possible to reduce costs and improve performance
4. **Enable Point-in-Time Recovery**: For critical data, enable point-in-time recovery
5. **Use TTL for Cleanup**: Configure TTL for items that should expire automatically
6. **Enable Deletion Protection**: For production tables, enable deletion protection
7. **Monitor Table Metrics**: Watch for throttling, consumed capacity, and error rates

## Integration with Other Features

The Table feature integrates seamlessly with other Awsless features:

- **Function**: Lambda functions can access tables with proper permissions
- **Stream**: Table streams can trigger Lambda functions
- **Task**: Tasks can read from and write to tables
- **Queue**: Queue consumers can process data from tables
- **Topic**: Topic subscribers can update tables
