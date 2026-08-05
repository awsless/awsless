# Transaction Operations

This section covers the transaction operations provided by the `@awsless/dynamodb` package for performing multiple operations atomically.

## Overview

DynamoDB transactions provide atomicity, consistency, isolation, and durability (ACID) across multiple operations on items in one or more tables. All changes either succeed or fail together as a single unit, with no partial completion.

The `@awsless/dynamodb` package provides a set of functions to work with DynamoDB transactions:

- `transactWrite`: Executes a transaction containing multiple operations.
- `transactPut`: Creates an item to be included in a transaction.
- `transactUpdate`: Updates an item as part of a transaction.
- `transactDelete`: Deletes an item as part of a transaction.
- `transactConditionCheck`: Checks a condition as part of a transaction.

## transactWrite

The `transactWrite` operation performs multiple operations as a single atomic transaction.

### Syntax

```typescript
await transactWrite(options);
```

### Parameters

- `options`: An object with transaction options:
  - `items`: An array of transaction operations (transactPut, transactUpdate, transactDelete, or transactConditionCheck).
  - `idempotantKey` (optional): A string that makes the request idempotent, preventing accidental duplicate transactions.

### Return Value

Returns a Promise that resolves when the transaction is complete.

### Example

```typescript
import {
  transactWrite,
  transactPut,
  transactUpdate,
  transactDelete,
  transactConditionCheck,
  define,
  object,
  string,
  number
} from '@awsless/dynamodb';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
    email: string(),
    postCount: number(),
  })
});

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

// Execute a transaction
await transactWrite({
  items: [
    // Check if user exists
    transactConditionCheck(users, { id: 'user123' }, {
      condition: exp => exp.where('id').exists()
    }),

    // Create a new post
    transactPut(posts, {
      userId: 'user123',
      postId: 'post456',
      title: 'New Post',
      content: 'Post content...'
    }),

    // Increment the user's post count
    transactUpdate(users, { id: 'user123' }, {
      update: exp => exp.update('postCount').add(1)
    })
  ]
});
```

## transactPut

The `transactPut` operation creates an item to be included in a transaction.

### Syntax

```typescript
const transactItem = transactPut<TableType>(
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

### Return Value

Returns a transaction item that can be included in the `items` array of a `transactWrite` operation.

### Example

```typescript
import { transactWrite, transactPut, define, object, string } from '@awsless/dynamodb';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
    email: string(),
  })
});

// Create a new user only if it doesn't already exist
await transactWrite({
  items: [
    transactPut(users, {
      id: 'user123',
      name: 'John Doe',
      email: 'john@example.com'
    }, {
      condition: exp => exp.where('id').not.exists()
    })
  ]
});
```

## transactUpdate

The `transactUpdate` operation updates an item as part of a transaction.

### Syntax

```typescript
const transactItem = transactUpdate<TableType>(
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

### Return Value

Returns a transaction item that can be included in the `items` array of a `transactWrite` operation.

### Example

```typescript
import { transactWrite, transactUpdate, define, object, string, number } from '@awsless/dynamodb';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
    email: string(),
    loginCount: number(),
    lastLogin: number(),
  })
});

// Update user login information
await transactWrite({
  items: [
    transactUpdate(users, { id: 'user123' }, {
      update: exp => exp
        .update('loginCount').add(1)
        .update('lastLogin').set(Date.now()),
      condition: exp => exp.where('id').exists()
    })
  ]
});
```

## transactDelete

The `transactDelete` operation deletes an item as part of a transaction.

### Syntax

```typescript
const transactItem = transactDelete<TableType>(
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

### Return Value

Returns a transaction item that can be included in the `items` array of a `transactWrite` operation.

### Example

```typescript
import { transactWrite, transactDelete, define, object, string, number } from '@awsless/dynamodb';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
    email: string(),
    role: string(),
  })
});

// Delete a user only if they are not an admin
await transactWrite({
  items: [
    transactDelete(users, { id: 'user123' }, {
      condition: exp => exp.where('role').ne('admin')
    })
  ]
});
```

## transactConditionCheck

The `transactConditionCheck` operation checks a condition as part of a transaction without modifying any data.

### Syntax

```typescript
const transactItem = transactConditionCheck<TableType>(
  table,
  key,
  options
);
```

### Parameters

- `table`: The table definition created with the `define` function.
- `key`: The primary key of the item to check. This must include the hash key and, if defined, the sort key.
- `options`: An object with condition options:
  - `condition`: A function that defines a condition expression that must be satisfied for the transaction to succeed.

### Return Value

Returns a transaction item that can be included in the `items` array of a `transactWrite` operation.

### Example

```typescript
import { transactWrite, transactConditionCheck, transactPut, define, object, string } from '@awsless/dynamodb';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
    email: string(),
    isActive: boolean(),
  })
});

const orders = define('orders', {
  hash: 'orderId',
  schema: object({
    orderId: string(),
    userId: string(),
    amount: number(),
    status: string(),
  })
});

// Create an order only if the user exists and is active
await transactWrite({
  items: [
    transactConditionCheck(users, { id: 'user123' }, {
      condition: exp => exp.where('isActive').eq(true)
    }),

    transactPut(orders, {
      orderId: 'order789',
      userId: 'user123',
      amount: 99.99,
      status: 'pending'
    })
  ]
});
```

## Error Handling

When a transaction fails, DynamoDB throws a `TransactionCanceledException`. The `@awsless/dynamodb` package enhances this exception with additional information about which condition check failed.

### Example

```typescript
import { transactWrite, transactConditionCheck, TransactionCanceledException } from '@awsless/dynamodb';

try {
  await transactWrite({
    items: [
      transactConditionCheck(users, { id: 'user123' }, {
        condition: exp => exp.where('isActive').eq(true)
      }),
      // Other operations...
    ]
  });
} catch (error) {
  if (error instanceof TransactionCanceledException) {
    console.log('Transaction failed:', error.message);
    console.log('Cancellation reasons:', error.reasons);
    // Handle the error appropriately
  } else {
    throw error;
  }
}
```

## Limitations and Considerations

### Transaction Size Limits

DynamoDB has the following limits for transactions:

- A transaction can include up to 100 unique items.
- A transaction cannot contain multiple operations on the same item.
- The total size of all items in a transaction cannot exceed 4 MB.

### Idempotency

To make a transaction idempotent (safe to retry without causing duplicate effects), use the `idempotantKey` option:

```typescript
await transactWrite({
  idempotantKey: 'unique-transaction-id',
  items: [
    // Transaction operations...
  ]
});
```

### Performance Considerations

- Transactions have additional overhead compared to non-transactional operations.
- Use transactions only when you need the ACID guarantees they provide.
- For better performance with non-critical operations, consider using batch operations instead.
- Transactions consume twice the write capacity units (WCUs) of standard write operations.
