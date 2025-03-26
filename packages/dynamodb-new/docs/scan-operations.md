# Scan Operations

This section covers the scan operations provided by the `@awsless/dynamodb` package for retrieving multiple items from a DynamoDB table without using a key condition.

## scan

The `scan` operation retrieves multiple items from a DynamoDB table by scanning the entire table.

### Syntax

```typescript
const result = await scan<TableType, ProjectionType, IndexType>(
  table,
  options
);
```

### Parameters

- `table`: The table definition created with the `define` function.
- `options` (optional): An object with scan options:
  - `projection` (optional): An array of attribute names to retrieve.
  - `index` (optional): The name of a secondary index to scan.
  - `consistentRead` (optional): Boolean indicating whether to use strongly consistent reads (not available for global secondary indexes).
  - `limit` (optional): The maximum number of items to evaluate. Default is 10.
  - `cursor` (optional): The key to start the scan from (for pagination).

### Return Value

Returns an object with the following properties:
- `count`: The number of items returned.
- `items`: An array of items that match the scan criteria.
- `cursor`: The key of the last evaluated item, which can be used for pagination. Will be undefined if there are no more items to retrieve.

### Example

```typescript
import { scan, define, object, string, number } from '@awsless/dynamodb';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
    email: string(),
    age: number(),
  })
});

// Scan the entire table
const result = await scan(users);

// Scan with a limit
const result = await scan(users, {
  limit: 20
});

// Scan with projection
const result = await scan(users, {
  projection: ['id', 'name']
});

// Scan a secondary index
const posts = define('posts', {
  hash: 'userId',
  sort: 'postId',
  schema: object({
    userId: string(),
    postId: string(),
    title: string(),
    category: string(),
  }),
  indexes: {
    byCategory: {
      hash: 'category'
    }
  }
});

const result = await scan(posts, {
  index: 'byCategory'
});

// Pagination example
let cursor;
do {
  const result = await scan(users, {
    cursor,
    limit: 10
  });

  // Process the items
  for (const item of result.items) {
    console.log(item);
  }

  // Update the cursor for the next page
  cursor = result.cursor;
} while (cursor);
```

## scanAll

The `scanAll` operation is an async iterator that automatically handles pagination to retrieve all items in a table.

### Syntax

```typescript
for await (const items of scanAll<TableType, ProjectionType, IndexType>(
  table,
  options
)) {
  // Process batch of items
}
```

### Parameters

- `table`: The table definition created with the `define` function.
- `options` (optional): An object with scan options:
  - `projection` (optional): An array of attribute names to retrieve.
  - `index` (optional): The name of a secondary index to scan.
  - `consistentRead` (optional): Boolean indicating whether to use strongly consistent reads.
  - `batch` (optional): The number of items to retrieve in each batch. Default is 100.

### Return Value

Returns an async iterator that yields batches of items from the table.

### Example

```typescript
import { scanAll, define, object, string, number } from '@awsless/dynamodb';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
    email: string(),
    age: number(),
  })
});

// Process all users in batches of 50
for await (const items of scanAll(users, {
  batch: 50
})) {
  // Process this batch of items
  for (const item of items) {
    console.log(item.name);
  }
}

// Using with Promise.all for parallel processing
const processItems = async (items) => {
  // Process items in parallel
  await Promise.all(items.map(async (item) => {
    // Process each item
  }));
};

for await (const items of scanAll(users)) {
  await processItems(items);
}
```

## paginateScan

The `paginateScan` operation is similar to `scan` but provides string-based cursors for easier pagination in web applications.

### Syntax

```typescript
const result = await paginateScan<TableType, ProjectionType, IndexType>(
  table,
  options
);
```

### Parameters

- `table`: The table definition created with the `define` function.
- `options` (optional): An object with scan options:
  - `projection` (optional): An array of attribute names to retrieve.
  - `index` (optional): The name of a secondary index to scan.
  - `consistentRead` (optional): Boolean indicating whether to use strongly consistent reads.
  - `limit` (optional): The maximum number of items to evaluate. Default is 10.
  - `cursor` (optional): A string-based cursor for pagination.

### Return Value

Returns an object with the following properties:
- `count`: The number of items returned.
- `items`: An array of items from the scan.
- `cursor`: A string-based cursor that can be used for pagination. Will be undefined if there are no more items to retrieve.

### Example

```typescript
import { paginateScan, define, object, string, number } from '@awsless/dynamodb';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
    email: string(),
    age: number(),
  })
});

// First page
const page1 = await paginateScan(users, {
  limit: 10
});

// Display items from page 1
page1.items.forEach(item => console.log(item));

// If there are more items, get the next page using the cursor
if (page1.cursor) {
  const page2 = await paginateScan(users, {
    limit: 10,
    cursor: page1.cursor
  });

  // Display items from page 2
  page2.items.forEach(item => console.log(item));
}
```

## Performance Considerations

- Scans are less efficient than queries because they read every item in the table or index.
- Use queries instead of scans whenever possible.
- Consider using a secondary index if you frequently scan by specific attributes.
- Use the `limit` parameter to control the number of items returned in a single operation.
- For large tables, use `scanAll` or implement pagination with `scan` or `paginateScan`.
- DynamoDB has a 1MB limit per scan operation. If your scan exceeds this limit, you'll need to use pagination.
