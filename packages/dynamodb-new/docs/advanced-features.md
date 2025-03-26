# Advanced Features

This section covers advanced features and considerations when using the `@awsless/dynamodb` package.

## Error Handling

The `@awsless/dynamodb` package provides enhanced error handling for DynamoDB operations. It exposes the standard AWS SDK errors and adds additional context to help with debugging.

### Common DynamoDB Errors

#### ConditionalCheckFailedException

Thrown when a condition expression evaluates to false during an operation.

```typescript
import { putItem, ConditionalCheckFailedException, define, object, string } from '@awsless/dynamodb';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
  })
});

try {
  await putItem(users, {
    id: 'user123',
    name: 'John Doe',
  }, {
    condition: exp => exp.where('id').not.exists()
  });
} catch (error) {
  if (error instanceof ConditionalCheckFailedException) {
    console.log('User already exists');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

#### TransactionCanceledException

Thrown when a transaction fails. The `@awsless/dynamodb` package enhances this error with additional information about which condition check failed.

```typescript
import {
  transactWrite,
  transactConditionCheck,
  transactPut,
  TransactionCanceledException,
  define,
  object,
  string
} from '@awsless/dynamodb';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
    isActive: boolean(),
  })
});

try {
  await transactWrite({
    items: [
      transactConditionCheck(users, { id: 'user123' }, {
        condition: exp => exp.where('isActive').eq(true)
      }),
      transactPut(users, {
        id: 'user456',
        name: 'Jane Smith',
        isActive: true
      })
    ]
  });
} catch (error) {
  if (error instanceof TransactionCanceledException) {
    console.log('Transaction failed:', error.message);
    console.log('Cancellation reasons:', error.reasons);
    // Handle the error appropriately
  } else {
    console.error('Unexpected error:', error);
  }
}
```

#### ResourceNotFoundException

Thrown when the requested resource (table, index, etc.) does not exist.

```typescript
import { getItem, ResourceNotFoundException, define, object, string } from '@awsless/dynamodb';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
  })
});

try {
  await getItem(users, { id: 'user123' });
} catch (error) {
  if (error instanceof ResourceNotFoundException) {
    console.log('Table does not exist');
    // Create the table or handle the error
  } else {
    console.error('Unexpected error:', error);
  }
}
```

#### ProvisionedThroughputExceededException

Thrown when the request rate is too high for the table's provisioned throughput.

```typescript
import { putItem, ProvisionedThroughputExceededException, define, object, string } from '@awsless/dynamodb';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
  })
});

try {
  await putItem(users, {
    id: 'user123',
    name: 'John Doe',
  });
} catch (error) {
  if (error instanceof ProvisionedThroughputExceededException) {
    console.log('Rate limit exceeded, implementing backoff strategy');
    // Implement exponential backoff and retry
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### Implementing Retry Logic

For operations that might fail due to throttling or temporary issues, you can implement retry logic:

```typescript
import { putItem, ProvisionedThroughputExceededException, define, object, string } from '@awsless/dynamodb';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
  })
});

async function putItemWithRetry(item, maxRetries = 3, baseDelay = 100) {
  let retries = 0;

  while (true) {
    try {
      return await putItem(users, item);
    } catch (error) {
      if (error instanceof ProvisionedThroughputExceededException && retries < maxRetries) {
        retries++;
        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, retries) * (0.5 + Math.random() * 0.5);
        console.log(`Retry ${retries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

// Usage
await putItemWithRetry({
  id: 'user123',
  name: 'John Doe',
});
```

## Debugging

The `@awsless/dynamodb` package includes built-in debugging capabilities to help you understand what's happening with your DynamoDB operations.

### Enabling Debug Mode

You can enable debug mode by setting the `debug` option to `true` in your operations:

```typescript
import { getItem, define, object, string } from '@awsless/dynamodb';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
  })
});

// Enable debug mode for a specific operation
const user = await getItem(users, { id: 'user123' }, {
  debug: true
});
```

This will log the DynamoDB command and its parameters to the console, which can be helpful for debugging.

### Custom Debug Function

You can also provide a custom debug function:

```typescript
import { getItem, define, object, string } from '@awsless/dynamodb';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
  })
});

// Custom debug function
const customDebug = (command) => {
  console.log('DynamoDB Command:', command.constructor.name);
  console.log('Parameters:', JSON.stringify(command.input, null, 2));
  // You could also log to a file, send to a monitoring service, etc.
};

// Use custom debug function
const user = await getItem(users, { id: 'user123' }, {
  debug: customDebug
});
```

### Debugging Expressions

When working with complex expressions, it can be helpful to see the generated DynamoDB expressions:

```typescript
import { updateItem, define, object, string, number } from '@awsless/dynamodb';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
    age: number(),
    tags: array(string()),
  })
});

// Debug a complex update expression
await updateItem(users, { id: 'user123' }, {
  update: exp => exp
    .update('name').set('John Smith')
    .update('age').add(1)
    .update('tags').add(['premium']),
  debug: true
});
```

This will log the generated update expression, attribute names, and attribute values.

## Performance Considerations

### Batch Operations

For better performance when working with multiple items, use batch operations instead of individual operations:

```typescript
import { batchGetItem, batchPutItem, define, object, string } from '@awsless/dynamodb';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
  })
});

// Get multiple items in a single request
const userIds = ['user1', 'user2', 'user3'];
const users = await batchGetItem(users, userIds.map(id => ({ id })));

// Put multiple items in a single request
await batchPutItem(users, [
  { id: 'user1', name: 'John Doe' },
  { id: 'user2', name: 'Jane Smith' },
  { id: 'user3', name: 'Bob Johnson' },
]);
```

### Projections

When retrieving items, use projections to fetch only the attributes you need:

```typescript
import { getItem, query, define, object, string, number } from '@awsless/dynamodb';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
    email: string(),
    address: object({
      street: string(),
      city: string(),
      state: string(),
      zipCode: string(),
    }),
    preferences: object({
      theme: string(),
      notifications: boolean(),
    }),
  })
});

// Get only the attributes you need
const user = await getItem(users, { id: 'user123' }, {
  projection: exp => [exp.attr('name'), exp.attr('email')]
});

// Query with projection
const result = await query(users, {
  keyCondition: exp => exp.where('id').eq('user123'),
  projection: exp => [exp.attr('id'), exp.attr('name')]
});
```

### Pagination

For large result sets, use pagination to avoid loading too much data at once:

```typescript
import { query, define, object, string } from '@awsless/dynamodb';

const posts = define('posts', {
  hash: 'userId',
  sort: 'postId',
  schema: object({
    userId: string(),
    postId: string(),
    title: string(),
    content: string(),
  })
});

// Paginate through results
let cursor;
const pageSize = 10;
let page = 1;

do {
  const result = await query(posts, {
    keyCondition: exp => exp.where('userId').eq('user123'),
    limit: pageSize,
    cursor
  });

  console.log(`Page ${page}:`, result.items);

  cursor = result.cursor;
  page++;
} while (cursor);
```

### Consistent Reads

By default, DynamoDB uses eventually consistent reads. For operations where you need the most up-to-date data, use strongly consistent reads:

```typescript
import { getItem, define, object, string } from '@awsless/dynamodb';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
  })
});

// Use strongly consistent reads
const user = await getItem(users, { id: 'user123' }, {
  consistentRead: true
});
```

Note that consistent reads consume twice as many read capacity units (RCUs) as eventually consistent reads.

### Secondary Indexes

When querying data frequently by attributes other than the primary key, use secondary indexes:

```typescript
import { query, define, object, string, number } from '@awsless/dynamodb';

const orders = define('orders', {
  hash: 'userId',
  sort: 'orderId',
  schema: object({
    userId: string(),
    orderId: string(),
    status: string(),
    amount: number(),
    createdAt: number(),
  }),
  indexes: {
    byStatus: {
      hash: 'status',
      sort: 'createdAt'
    }
  }
});

// Query by status using the secondary index
const pendingOrders = await query(orders, {
  index: 'byStatus',
  keyCondition: exp => exp
    .where('status').eq('pending')
    .where('createdAt').gt(1609459200000) // Orders created after Jan 1, 2021
});
```

### Transactions vs. Batch Operations

- Use **transactions** when you need atomicity (all operations succeed or fail together).
- Use **batch operations** when you need to perform multiple independent operations efficiently.

Transactions consume more capacity units but provide stronger consistency guarantees.

## Custom Client Configuration

You can customize the DynamoDB client configuration for specific operations:

```typescript
import { getItem, define, object, string } from '@awsless/dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
  })
});

// Custom client configuration
const customClient = new DynamoDBClient({
  region: 'us-west-2',
  maxAttempts: 5,
  retryMode: 'adaptive',
});

// Use custom client for a specific operation
const user = await getItem(users, { id: 'user123' }, {
  client: customClient
});
```

## Working with Large Items

DynamoDB has a 400KB size limit for items. For larger data, consider these strategies:

### Splitting Large Attributes

For large text or binary data, consider splitting it into chunks:

```typescript
import { putItem, getItem, define, object, string, array } from '@awsless/dynamodb';

const documents = define('documents', {
  hash: 'id',
  schema: object({
    id: string(),
    title: string(),
    contentChunks: array(string()), // Array of content chunks
  })
});

// Split content into chunks
function splitIntoChunks(content, chunkSize = 350000) {
  const chunks = [];
  for (let i = 0; i < content.length; i += chunkSize) {
    chunks.push(content.substring(i, i + chunkSize));
  }
  return chunks;
}

// Store a large document
const largeContent = '...'; // Large text content
await putItem(documents, {
  id: 'doc123',
  title: 'Large Document',
  contentChunks: splitIntoChunks(largeContent)
});

// Retrieve and reassemble
const document = await getItem(documents, { id: 'doc123' });
const fullContent = document.contentChunks.join('');
```

### Using S3 for Large Data

For very large data, store it in S3 and keep a reference in DynamoDB:

```typescript
import { putItem, define, object, string } from '@awsless/dynamodb';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const documents = define('documents', {
  hash: 'id',
  schema: object({
    id: string(),
    title: string(),
    contentS3Key: string(), // S3 key for the content
  })
});

const s3Client = new S3Client({ region: 'us-east-1' });
const bucketName = 'my-document-bucket';

// Store a large document
async function storeDocument(id, title, content) {
  // Upload content to S3
  const s3Key = `documents/${id}/content`;
  await s3Client.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: s3Key,
    Body: content
  }));

  // Store metadata in DynamoDB
  await putItem(documents, {
    id,
    title,
    contentS3Key: s3Key
  });
}

// Retrieve a document
async function getDocument(id) {
  // Get metadata from DynamoDB
  const document = await getItem(documents, { id });

  // Get content from S3
  const s3Response = await s3Client.send(new GetObjectCommand({
    Bucket: bucketName,
    Key: document.contentS3Key
  }));

  // Convert stream to string
  const content = await streamToString(s3Response.Body);

  return {
    ...document,
    content
  };
}

// Helper to convert stream to string
function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
  });
}
