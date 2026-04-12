# Store Feature

The Store feature in Awsless provides a streamlined way to define, configure, and use Amazon S3 buckets for object storage. It handles the complex aspects of storage setup including bucket configuration, event notifications, versioning, and type-safe access from your application code.

## Overview

Object storage is essential for many applications. The Store feature in Awsless makes it easy to:

- Define S3 buckets with optimal configurations
- Configure event notifications for object operations
- Enable versioning for data protection
- Set up deletion protection for critical data
- Use type-safe storage operations from your application code

## Schema

The Store feature uses a simple schema to define storage buckets in your stack:

### Basic Usage

The simplest way to define a storage bucket is with default settings:

```json
{
  "stores": ["assets"]
}
```

### Advanced Configuration

For more control, you can use the full configuration object:

```json
{
  "stores": {
    "assets": {
      "versioning": true,
      "deletionProtection": true,
      "events": {
        "created:*": "./src/handlers/asset-created.ts",
        "removed:delete": {
          "code": {
            "file": "./src/handlers/asset-deleted.ts",
            "minify": true
          },
          "memorySize": "256 MB"
        }
      }
    }
  }
}
```

### Global Configuration

You can set global defaults for all stores in your application's base configuration:

```json
{
  "defaults": {
    "store": {
      "deletionProtection": true
    }
  }
}
```

### Schema Properties

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `versioning` | Boolean | Enable object versioning | `false` |
| `deletionProtection` | Boolean | Protect the bucket from deletion | `false` |
| `events` | Object | Event handlers for bucket operations | - |

#### Event Handlers

The `events` property allows you to define Lambda functions that are triggered by bucket events:

| Event | Description |
|-------|-------------|
| `created:*` | Any object creation event |
| `created:put` | Object created using PUT operation |
| `created:post` | Object created using POST operation |
| `created:copy` | Object created using COPY operation |
| `created:upload` | Object created using multipart upload |
| `removed:*` | Any object removal event |
| `removed:delete` | Object deleted |
| `removed:marker` | Delete marker created for versioned object |

## How Stores Work

When you define a store in Awsless:

1. An S3 bucket is created with your specified configuration
2. Event notifications are set up to trigger Lambda functions
3. IAM permissions are configured to allow access to the bucket
4. Type definitions are generated for type-safe storage operations

## Type-Safe Storage Operations

One of the key benefits of the Store feature is type-safe storage operations from your application code. When you run `pnpm awsless dev`, Awsless generates TypeScript definitions for all your stores, allowing you to access them with full type safety:

```typescript
import { Store } from '@awsless/awsless'

// Upload a file
await Store.myStack.assets.put('images/profile.jpg', imageBuffer, {
  metadata: {
    userId: '123',
    contentType: 'image/jpeg'
  }
})

// Check if a file exists
const exists = await Store.myStack.assets.has('images/profile.jpg')

// Download a file
const fileStream = await Store.myStack.assets.get('images/profile.jpg')
if (fileStream) {
  // Process the file stream
  const chunks = []
  for await (const chunk of fileStream) {
    chunks.push(chunk)
  }
  const buffer = Buffer.concat(chunks)
}

// Delete a file
await Store.myStack.assets.delete('images/profile.jpg')
```

## Event Handlers

Event handlers are Lambda functions that are triggered by bucket events. They receive an event object with information about the object that triggered the event:

```typescript
export default async function(event: {
  Records: Array<{
    eventVersion: string;
    eventSource: string;
    awsRegion: string;
    eventTime: string;
    eventName: string;
    userIdentity: {
      principalId: string;
    };
    requestParameters: {
      sourceIPAddress: string;
    };
    responseElements: {
      'x-amz-request-id': string;
      'x-amz-id-2': string;
    };
    s3: {
      s3SchemaVersion: string;
      configurationId: string;
      bucket: {
        name: string;
        ownerIdentity: {
          principalId: string;
        };
        arn: string;
      };
      object: {
        key: string;
        size: number;
        eTag: string;
        versionId?: string;
        sequencer: string;
      };
    };
  }>;
}) {
  // Process each record
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = record.s3.object.key;
    const size = record.s3.object.size;

    console.log(`File ${key} (${size} bytes) was ${record.eventName} in bucket ${bucket}`);

    // Process the file based on the event
    if (record.eventName.startsWith('ObjectCreated:')) {
      // Handle file creation
    } else if (record.eventName.startsWith('ObjectRemoved:')) {
      // Handle file deletion
    }
  }
}
```

## Versioning

Object versioning allows you to preserve, retrieve, and restore every version of every object in your bucket. With versioning, you can recover from unintended user actions and application failures.

To enable versioning:

```json
{
  "stores": {
    "documents": {
      "versioning": true
    }
  }
}
```

## Deletion Protection

Deletion protection prevents accidental deletion of your bucket and its contents. When enabled, the bucket will not be deleted when you delete your stack or application.

To enable deletion protection:

```json
{
  "stores": {
    "critical-data": {
      "deletionProtection": true
    }
  }
}
```

You can also enable deletion protection globally for all stores:

```json
{
  "defaults": {
    "store": {
      "deletionProtection": true
    }
  }
}
```

## CORS Configuration

Cross-Origin Resource Sharing (CORS) is automatically configured to allow POST requests from any origin. This enables presigned POST uploads from web browsers.

## Best Practices

When using the Store feature, consider these best practices:

1. **Use Descriptive Store Names**: Choose names that reflect the purpose of the store
2. **Enable Versioning for Critical Data**: Use versioning to protect against accidental deletion or modification
3. **Use Event Handlers for Processing**: Process files asynchronously using event handlers
4. **Organize Objects with Key Prefixes**: Use key prefixes (like folders) to organize your objects
5. **Set Appropriate Metadata**: Include relevant metadata when uploading objects
6. **Implement Access Controls**: Use IAM policies to control access to your stores
7. **Consider Lifecycle Policies**: Set up lifecycle policies for automatic object management

## Integration with Other Features

The Store feature integrates seamlessly with other Awsless features:

- **Function**: Lambda functions can access stores for file operations
- **Task**: Tasks can perform background file processing
- **Site**: Static websites can serve files from stores
- **Queue**: Queue consumers can process files from stores
- **Topic**: Topic subscribers can be notified of file operations
