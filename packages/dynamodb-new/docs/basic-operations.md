# Basic Operations

This section covers the fundamental operations for interacting with DynamoDB tables using the `@awsless/dynamodb` package.

## getItem

The `getItem` operation retrieves a single item from a DynamoDB table by its primary key.

### Syntax

```typescript
const item = await getItem<TableType, ProjectionType>(
  table,
  key,
  options
);
```

### Parameters

- `table`: The table definition created with the `define` function.
- `key`: The primary key of the item to retrieve. This must include the hash key and, if defined, the sort key.
- `options` (optional): An object with additional options:
  - `consistentRead`: Boolean indicating whether to use strongly consistent reads.
  - `projection`: An array of attribute names to retrieve.

### Return Value

Returns the item if found, or `undefined` if no item exists with the specified key. The returned item is automatically unmarshalled to match your schema definition.

### Example

```typescript
import { getItem, define, object, string, number } from '@awsless/dynamodb';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
    email: string(),
    age: number(),
  })
});

// Get a user by ID
const user = await getItem(users, { id: 'user123' });

// Get a user with consistent read
const user = await getItem(users, { id: 'user123' }, {
  consistentRead: true
});

// Get only specific attributes
const user = await getItem(users, { id: 'user123' }, {
  projection: ['name', 'email']
});
```

## putItem

The `putItem` operation creates a new item or replaces an existing item in a DynamoDB table.

### Syntax

```typescript
const result = await putItem<TableType, ReturnType>(
  table,
  item,
  options
);
```

### Parameters

- `table`: The table definition created with the `define` function.
- `item`: The item to put into the table. This must match the schema defined for the table.
- `options` (optional): An object with additional options:
  - `condition`: A function that defines a condition expression that must be satisfied for the operation to succeed.
  - `return`: Specifies what values should be returned from the operation. Possible values are 'NONE', 'ALL_OLD'.

### Return Value

Returns the old item if `return` is set to 'ALL_OLD', otherwise returns `undefined`.

### Example

```typescript
import { putItem, define, object, string, number } from '@awsless/dynamodb';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
    email: string(),
    age: number(),
  })
});

// Create a new user
await putItem(users, {
  id: 'user123',
  name: 'John Doe',
  email: 'john@example.com',
  age: 30
});

// Create a user only if it doesn't already exist
await putItem(users, {
  id: 'user123',
  name: 'John Doe',
  email: 'john@example.com',
  age: 30
}, {
  condition: exp => exp.where('id').not.exists()
});

// Replace a user and return the old values
const oldUser = await putItem(users, {
  id: 'user123',
  name: 'John Doe Updated',
  email: 'john.updated@example.com',
  age: 31
}, {
  return: 'ALL_OLD'
});
```

## updateItem

The `updateItem` operation modifies an existing item in a DynamoDB table.

### Syntax

```typescript
const result = await updateItem<TableType, ReturnType>(
  table,
  key,
  options
);
```

### Parameters

- `table`: The table definition created with the `define` function.
- `key`: The primary key of the item to update. This must include the hash key and, if defined, the sort key.
- `options`: An object with update options:
  - `update`: A function that defines the update expression.
  - `condition` (optional): A function that defines a condition expression that must be satisfied for the operation to succeed.
  - `return` (optional): Specifies what values should be returned from the operation. Possible values are 'NONE', 'ALL_OLD', 'UPDATED_OLD', 'ALL_NEW', 'UPDATED_NEW'.

### Return Value

Returns the item based on the `return` option, or `undefined` if `return` is 'NONE'.

### Example

```typescript
import { updateItem, define, object, string, number } from '@awsless/dynamodb';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
    email: string(),
    age: number(),
    lastLogin: number(),
  })
});

// Update a user's email
await updateItem(users, { id: 'user123' }, {
  update: exp => exp.update('email').set('new.email@example.com')
});

// Update multiple attributes
await updateItem(users, { id: 'user123' }, {
  update: exp => exp
    .update('name').set('Updated Name')
    .update('age').set(32)
    .update('lastLogin').set(Date.now())
});

// Increment a counter
await updateItem(users, { id: 'user123' }, {
  update: exp => exp.update('age').add(1)
});

// Update with a condition
await updateItem(users, { id: 'user123' }, {
  update: exp => exp.update('email').set('new.email@example.com'),
  condition: exp => exp.where('age').gt(25)
});

// Update and return the new values
const updatedUser = await updateItem(users, { id: 'user123' }, {
  update: exp => exp.update('email').set('new.email@example.com'),
  return: 'ALL_NEW'
});
```

## deleteItem

The `deleteItem` operation deletes a single item from a DynamoDB table by its primary key.

### Syntax

```typescript
const result = await deleteItem<TableType, ReturnType>(
  table,
  key,
  options
);
```

### Parameters

- `table`: The table definition created with the `define` function.
- `key`: The primary key of the item to delete. This must include the hash key and, if defined, the sort key.
- `options` (optional): An object with additional options:
  - `condition`: A function that defines a condition expression that must be satisfied for the operation to succeed.
  - `return`: Specifies what values should be returned from the operation. Possible values are 'NONE', 'ALL_OLD'.

### Return Value

Returns the deleted item if `return` is set to 'ALL_OLD', otherwise returns `undefined`.

### Example

```typescript
import { deleteItem, define, object, string, number } from '@awsless/dynamodb';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
    email: string(),
    age: number(),
  })
});

// Delete a user
await deleteItem(users, { id: 'user123' });

// Delete a user only if a condition is met
await deleteItem(users, { id: 'user123' }, {
  condition: exp => exp.where('age').lt(30)
});

// Delete a user and return the deleted item
const deletedUser = await deleteItem(users, { id: 'user123' }, {
  return: 'ALL_OLD'
});
```

## getIndexedItem

The `getIndexedItem` operation retrieves a single item from a DynamoDB table using a secondary index.

### Syntax

```typescript
const item = await getIndexedItem<TableType, IndexType, ProjectionType>(
  table,
  indexName,
  key,
  options
);
```

### Parameters

- `table`: The table definition created with the `define` function.
- `indexName`: The name of the secondary index to use.
- `key`: The index key of the item to retrieve. This must include the hash key and, if defined, the sort key of the index.
- `options` (optional): An object with additional options:
  - `consistentRead`: Boolean indicating whether to use strongly consistent reads (only available for local secondary indexes).
  - `projection`: An array of attribute names to retrieve.

### Return Value

Returns the item if found, or `undefined` if no item exists with the specified key. The returned item is automatically unmarshalled to match your schema definition.

### Example

```typescript
import { getIndexedItem, define, object, string, number } from '@awsless/dynamodb';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    email: string(),
    username: string(),
    age: number(),
  }),
  indexes: {
    byEmail: {
      hash: 'email'
    },
    byUsername: {
      hash: 'username'
    }
  }
});

// Get a user by email
const user = await getIndexedItem(users, 'byEmail', {
  email: 'john@example.com'
});

// Get a user by username with projection
const user = await getIndexedItem(users, 'byUsername', {
  username: 'johndoe'
}, {
  projection: ['id', 'email']
});
```

## Error Handling

All operations can throw exceptions if something goes wrong. Common exceptions include:

- `ConditionalCheckFailedException`: Thrown when a condition expression evaluates to false.
- `ResourceNotFoundException`: Thrown when the table or index doesn't exist.
- `ProvisionedThroughputExceededException`: Thrown when the request rate is too high for the table's provisioned throughput.

Example of error handling:

```typescript
import { putItem, ConditionalCheckFailedException } from '@awsless/dynamodb';

try {
  await putItem(users, {
    id: 'user123',
    name: 'John Doe',
    email: 'john@example.com',
    age: 30
  }, {
    condition: exp => exp.where('id').not.exists()
  });
} catch (error) {
  if (error instanceof ConditionalCheckFailedException) {
    console.log('User already exists');
  } else {
    console.error('Error creating user:', error);
  }
}
