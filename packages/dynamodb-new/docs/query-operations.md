# Query Operations

This section covers the query operations provided by the `@awsless/dynamodb` package for retrieving multiple items from a DynamoDB table.

## query

The `query` operation retrieves multiple items from a DynamoDB table using a key condition expression.

### Syntax

```typescript
const result = await query<TableType, ProjectionType, IndexType>(
  table,
  options
);
```

### Parameters

- `table`: The table definition created with the `define` function.
- `options`: An object with query options:
  - `keyCondition`: A function that defines the key condition expression.
  - `projection` (optional): An array of attribute names to retrieve.
  - `index` (optional): The name of a secondary index to query.
  - `consistentRead` (optional): Boolean indicating whether to use strongly consistent reads (not available for global secondary indexes).
  - `forward` (optional): Boolean indicating whether to scan forward (true) or backward (false). Default is true.
  - `limit` (optional): The maximum number of items to evaluate. Default is 10.
  - `cursor` (optional): The key to start the query from (for pagination).

### Return Value

Returns an object with the following properties:
- `count`: The number of items returned.
- `items`: An array of items that match the query criteria.
- `cursor`: The key of the last evaluated item, which can be used for pagination. Will be undefined if there are no more items to retrieve.

### Example

```typescript
import { query, define, object, string, number } from '@awsless/dynamodb';

const posts = define('posts', {
  hash: 'userId',
  sort: 'postId',
  schema: object({
    userId: string(),
    postId: string(),
    title: string(),
    content: string(),
    createdAt: number(),
  }),
  indexes: {
    byCreatedAt: {
      hash: 'userId',
      sort: 'createdAt'
    }
  }
});

// Query posts by userId
const result = await query(posts, {
  keyCondition: exp => exp.where('userId').eq('user123')
});

// Query posts by userId with a sort key condition
const result = await query(posts, {
  keyCondition: exp => exp
    .where('userId').eq('user123')
    .where('postId').beginsWith('2023-')
});

// Query posts using a secondary index
const result = await query(posts, {
  index: 'byCreatedAt',
  keyCondition: exp => exp
    .where('userId').eq('user123')
    .where('createdAt').gt(1609459200000) // Posts created after Jan 1, 2021
});

// Query with a limit and in reverse order
const result = await query(posts, {
  keyCondition: exp => exp.where('userId').eq('user123'),
  limit: 5,
  forward: false // Newest first if sort key is a timestamp
});

// Query with projection
const result = await query(posts, {
  keyCondition: exp => exp.where('userId').eq('user123'),
  projection: ['postId', 'title']
});

// Pagination example
let cursor;
do {
  const result = await query(posts, {
    keyCondition: exp => exp.where('userId').eq('user123'),
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

## queryAll

The `queryAll` operation is an async iterator that automatically handles pagination to retrieve all items matching a query.

### Syntax

```typescript
for await (const items of queryAll<TableType, ProjectionType, IndexType>(
  table,
  options
)) {
  // Process batch of items
}
```

### Parameters

- `table`: The table definition created with the `define` function.
- `options`: An object with query options:
  - `keyCondition`: A function that defines the key condition expression.
  - `projection` (optional): An array of attribute names to retrieve.
  - `index` (optional): The name of a secondary index to query.
  - `consistentRead` (optional): Boolean indicating whether to use strongly consistent reads.
  - `forward` (optional): Boolean indicating whether to scan forward (true) or backward (false). Default is true.
  - `batch` (optional): The number of items to retrieve in each batch. Default is 100.

### Return Value

Returns an async iterator that yields batches of items matching the query criteria.

### Example

```typescript
import { queryAll, define, object, string, number } from '@awsless/dynamodb';

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

// Process all posts for a user in batches of 50
for await (const items of queryAll(posts, {
  keyCondition: exp => exp.where('userId').eq('user123'),
  batch: 50
})) {
  // Process this batch of items
  for (const item of items) {
    console.log(item.title);
  }
}

// Using with Promise.all for parallel processing
const processItems = async (items) => {
  // Process items in parallel
  await Promise.all(items.map(async (item) => {
    // Process each item
  }));
};

for await (const items of queryAll(posts, {
  keyCondition: exp => exp.where('userId').eq('user123')
})) {
  await processItems(items);
}
```

## paginateQuery

The `paginateQuery` operation is similar to `query` but provides string-based cursors for easier pagination in web applications.

### Syntax

```typescript
const result = await paginateQuery<TableType, ProjectionType, IndexType>(
  table,
  options
);
```

### Parameters

- `table`: The table definition created with the `define` function.
- `options`: An object with query options:
  - `keyCondition`: A function that defines the key condition expression.
  - `projection` (optional): An array of attribute names to retrieve.
  - `index` (optional): The name of a secondary index to query.
  - `consistentRead` (optional): Boolean indicating whether to use strongly consistent reads.
  - `forward` (optional): Boolean indicating whether to scan forward (true) or backward (false). Default is true.
  - `limit` (optional): The maximum number of items to evaluate. Default is 10.
  - `cursor` (optional): A string-based cursor for pagination.

### Return Value

Returns an object with the following properties:
- `count`: The number of items returned.
- `items`: An array of items that match the query criteria.
- `cursor`: A string-based cursor that can be used for pagination. Will be undefined if there are no more items to retrieve.

### Example

```typescript
import { paginateQuery, define, object, string, number } from '@awsless/dynamodb';

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

// First page
const page1 = await paginateQuery(posts, {
  keyCondition: exp => exp.where('userId').eq('user123'),
  limit: 10
});

// Display items from page 1
page1.items.forEach(item => console.log(item));

// If there are more items, get the next page using the cursor
if (page1.cursor) {
  const page2 = await paginateQuery(posts, {
    keyCondition: exp => exp.where('userId').eq('user123'),
    limit: 10,
    cursor: page1.cursor
  });

  // Display items from page 2
  page2.items.forEach(item => console.log(item));
}
```

## Key Condition Expressions

Key condition expressions are used to specify the items to retrieve in a query operation. They can only be applied to key attributes (partition key and sort key).

### Partition Key Conditions

For the partition key, you can only use the equality operator:

```typescript
exp.where('partitionKey').eq(value)
```

### Sort Key Conditions

For the sort key, you can use various comparison operators:

```typescript
// Equality
exp.where('sortKey').eq(value)

// Less than
exp.where('sortKey').lt(value)

// Less than or equal to
exp.where('sortKey').lte(value)

// Greater than
exp.where('sortKey').gt(value)

// Greater than or equal to
exp.where('sortKey').gte(value)

// Between two values (inclusive)
exp.where('sortKey').between(value1, value2)

// Begins with a prefix (for string sort keys)
exp.where('sortKey').beginsWith(prefix)
```

### Combining Conditions

You can combine a partition key condition with a sort key condition:

```typescript
exp
  .where('partitionKey').eq(value)
  .where('sortKey').beginsWith(prefix)
```

## Performance Considerations

- Queries are more efficient than scans because they use the table's indexes.
- Always try to use the most selective condition first to minimize the amount of data scanned.
- Consider using a secondary index if you frequently query by attributes other than the primary key.
- Use the `limit` parameter to control the number of items returned in a single operation.
- For large result sets, use `queryAll` or implement pagination with `query` or `paginateQuery`.
