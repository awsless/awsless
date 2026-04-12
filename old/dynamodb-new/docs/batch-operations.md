# Batch Operations

This section covers the batch operations provided by the `@awsless/dynamodb` package for performing multiple operations in a single request.

## batchGetItem

The `batchGetItem` operation retrieves multiple items from a DynamoDB table in a single request.

### Syntax

```typescript
const items = await batchGetItem<TableType, ProjectionType, FilterOption>(
  table,
  keys,
  options
);
```

### Parameters

- `table`: The table definition created with the `define` function.
- `keys`: An array of primary keys for the items to retrieve. Each key must include the hash key and, if defined, the sort key.
- `options` (optional): An object with additional options:
  - `projection` (optional): An array of attribute names to retrieve, specified as `{ "projection": ["attribute1", "attribute2"] }`.
  - `consistentRead` (optional): Boolean indicating whether to use strongly consistent reads.
  - `filterNonExistentItems` (optional): Boolean indicating whether to filter out non-existent items from the result. Default is false.

### Return Value

Returns an array of items matching the provided keys. If `filterNonExistentItems` is false (default), the array will have the same length as the keys array, with undefined values for keys that don't match any items. If `filterNonExistentItems` is true, the array will only contain the items that exist.

### Example

```typescript
import { batchGetItem, define, object, string, number } from '@awsless/dynamodb';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
    email: string(),
    age: number(),
  })
});

// Get multiple users by ID
const userIds = ['user1', 'user2', 'user3'];
const users = await batchGetItem(users, userIds.map(id => ({ id })));

// Get multiple users with projection
const users = await batchGetItem(users, userIds.map(id => ({ id })), {
  "projection": ["id", "name"]
});

// Get multiple users and filter out non-existent ones
const users = await batchGetItem(users, userIds.map(id => ({ id })), {
  filterNonExistentItems: true
});
```

## batchPutItem

The `batchPutItem` operation writes multiple items to a DynamoDB table in a single request.

### Syntax

```typescript
await batchPutItem<TableType>(
  table,
  items
);
```

### Parameters

- `table`: The table definition created with the `define` function.
- `items`: An array of items to put into the table. Each item must match the schema defined for the table.

### Return Value

Returns a Promise that resolves when the operation is complete.

### Example

```typescript
import { batchPutItem, define, object, string, number } from '@awsless/dynamodb';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
    email: string(),
    age: number(),
  })
});

// Create multiple users
await batchPutItem(users, [
  {
    id: 'user1',
    name: 'John Doe',
    email: 'john@example.com',
    age: 30
  },
  {
    id: 'user2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    age: 28
  },
  {
    id: 'user3',
    name: 'Bob Johnson',
    email: 'bob@example.com',
    age: 35
  }
]);
```

## batchDeleteItem

The `batchDeleteItem` operation deletes multiple items from a DynamoDB table in a single request.

### Syntax

```typescript
await batchDeleteItem<TableType>(
  table,
  keys
);
```

### Parameters

- `table`: The table definition created with the `define` function.
- `keys`: An array of primary keys for the items to delete. Each key must include the hash key and, if defined, the sort key.

### Return Value

Returns a Promise that resolves when the operation is complete.

### Example

```typescript
import { batchDeleteItem, define, object, string, number } from '@awsless/dynamodb';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
    email: string(),
    age: number(),
  })
});

// Delete multiple users
const userIds = ['user1', 'user2', 'user3'];
await batchDeleteItem(users, userIds.map(id => ({ id })));
```

## Limitations and Considerations

### Batch Size Limits

DynamoDB has the following limits for batch operations:

- A single batch operation can include up to 25 items.
- The total size of all items in a batch cannot exceed 16 MB.

If you need to process more than 25 items, you'll need to split your operation into multiple batches.

### Error Handling

Batch operations in DynamoDB are partially atomic. If some items in a batch fail to be processed, the operation will still proceed with the other items. The `@awsless/dynamodb` package handles retries for unprocessed items automatically.

### Condition Expressions

Unlike single-item operations, batch operations do not support condition expressions. If you need to perform conditional writes, you should use transaction operations or individual item operations.

### Performance Considerations

- Batch operations are more efficient than performing multiple individual operations because they reduce the number of network round trips.
- For very large datasets, consider using a combination of batch operations and parallel processing.
- If you need to perform conditional operations or need atomicity across all items, use transaction operations instead.

## Example: Processing Large Datasets

Here's an example of how to process a large dataset using batch operations:

```typescript
import { batchPutItem, define, object, string, number } from '@awsless/dynamodb';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
    email: string(),
    age: number(),
  })
});

// Function to process a large dataset in batches
async function processLargeDataset(allItems) {
  // Process in batches of 25 (DynamoDB's limit)
  const batchSize = 25;

  for (let i = 0; i < allItems.length; i += batchSize) {
    const batch = allItems.slice(i, i + batchSize);
    await batchPutItem(users, batch);
    console.log(`Processed batch ${i / batchSize + 1}`);
  }
}

// Example usage
const largeDataset = [
  // ... many items ...
];

await processLargeDataset(largeDataset);
