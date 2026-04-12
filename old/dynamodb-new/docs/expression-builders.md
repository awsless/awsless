# Expression Builders

This section covers the expression builders provided by the `@awsless/dynamodb` package for creating DynamoDB expressions.

## Overview

DynamoDB operations often require expressions to specify conditions, updates, projections, and key conditions. The `@awsless/dynamodb` package provides type-safe expression builders to make it easier to create these expressions.

There are four main types of expressions:

1. **Condition Expressions**: Used to determine whether an operation should succeed based on the state of an item.
2. **Update Expressions**: Used to specify how to modify an item's attributes.
3. **Projection Expressions**: Used to specify which attributes to retrieve from an item.
4. **Key Condition Expressions**: Used to specify which items to retrieve in a query operation.

## Condition Expressions

Condition expressions are used in operations like `putItem`, `updateItem`, `deleteItem`, and transaction operations to specify conditions that must be met for the operation to succeed.

### Basic Syntax

```typescript
condition: exp => exp.where('attributeName').operator(value)
```

### Operators

- `eq(value)`: Equal to
- `ne(value)`: Not equal to
- `lt(value)`: Less than
- `lte(value)`: Less than or equal to
- `gt(value)`: Greater than
- `gte(value)`: Greater than or equal to
- `between(value1, value2)`: Between two values (inclusive)
- `beginsWith(prefix)`: Begins with a prefix (for strings)
- `contains(value)`: Contains a value (for strings, lists, and sets)
- `exists()`: Attribute exists
- `not.exists()`: Attribute does not exist
- `size.eq(value)`: Size of attribute equals value
- `size.ne(value)`: Size of attribute does not equal value
- `size.lt(value)`: Size of attribute is less than value
- `size.lte(value)`: Size of attribute is less than or equal to value
- `size.gt(value)`: Size of attribute is greater than value
- `size.gte(value)`: Size of attribute is greater than or equal to value

### Combining Conditions

Conditions can be combined using logical operators:

- `and(condition1, condition2, ...)`: Logical AND
- `or(condition1, condition2, ...)`: Logical OR
- `not(condition)`: Logical NOT

### Examples

```typescript
import { putItem, updateItem, deleteItem, define, object, string, number } from '@awsless/dynamodb';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
    email: string(),
    age: number(),
    tags: array(string()),
  })
});

// Put item only if it doesn't exist
await putItem(users, {
  id: 'user123',
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
  tags: ['customer', 'premium']
}, {
  condition: exp => exp.where('id').not.exists()
});

// Update item only if age is greater than 18
await updateItem(users, { id: 'user123' }, {
  update: exp => exp.update('name').set('John Smith'),
  condition: exp => exp.where('age').gt(18)
});

// Delete item only if it has a specific tag
await deleteItem(users, { id: 'user123' }, {
  condition: exp => exp.where('tags').contains('premium')
});

// Complex condition with logical operators
await updateItem(users, { id: 'user123' }, {
  update: exp => exp.update('email').set('john.smith@example.com'),
  condition: exp => exp.where('age').gte(18).and(
    exp.where('tags').contains('premium').or(
      exp.where('tags').contains('vip')
    )
  )
});
```

## Update Expressions

Update expressions are used in operations like `updateItem` and `transactUpdate` to specify how to modify an item's attributes.

### Basic Syntax

```typescript
update: exp => exp.update('attributeName').operation(value)
```

### Operations

- `set(value)`: Set an attribute to a value
- `remove()`: Remove an attribute
- `add(value)`: Add a numeric value to an attribute or add elements to a set
- `delete(value)`: Remove elements from a set

### Examples

```typescript
import { updateItem, define, object, string, number, array } from '@awsless/dynamodb';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
    email: string(),
    age: number(),
    loginCount: number(),
    lastLogin: number(),
    tags: array(string()),
  })
});

// Set an attribute
await updateItem(users, { id: 'user123' }, {
  update: exp => exp.update('name').set('John Smith')
});

// Set multiple attributes
await updateItem(users, { id: 'user123' }, {
  update: exp => exp
    .update('name').set('John Smith')
    .update('email').set('john.smith@example.com')
    .update('lastLogin').set(Date.now())
});

// Increment a counter
await updateItem(users, { id: 'user123' }, {
  update: exp => exp.update('loginCount').add(1)
});

// Remove an attribute
await updateItem(users, { id: 'user123' }, {
  update: exp => exp.update('temporaryField').remove()
});

// Add elements to a set
await updateItem(users, { id: 'user123' }, {
  update: exp => exp.update('tags').add(['premium'])
});

// Remove elements from a set
await updateItem(users, { id: 'user123' }, {
  update: exp => exp.update('tags').delete(['trial'])
});
```

## Projection Expressions

Projection expressions are used in operations like `getItem`, `query`, and `scan` to specify which attributes to retrieve from an item.

### Basic Syntax

```typescript
projection: ['attribute1', 'attribute2', ...]
```

### Examples

```typescript
import { getItem, query, define, object, string, number } from '@awsless/dynamodb';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
    email: string(),
    age: number(),
    address: object({
      street: string(),
      city: string(),
      country: string(),
    }),
  })
});

// Get only specific attributes
const user = await getItem(users, { id: 'user123' }, {
  projection: ['name', 'email']
});

// Query with projection
const result = await query(users, {
  keyCondition: exp => exp.where('id').eq('user123'),
  projection: ['id', 'name', 'email']
});
```

## Key Condition Expressions

Key condition expressions are used in operations like `query` to specify which items to retrieve based on primary key attributes.

### Basic Syntax

```typescript
keyCondition: exp => exp.where('hashKey').eq(value)
```

or with a sort key:

```typescript
keyCondition: exp => exp
  .where('hashKey').eq(value)
  .where('sortKey').operator(value)
```

### Operators for Hash Key

- `eq(value)`: Equal to (the only operator allowed for hash key)

### Operators for Sort Key

- `eq(value)`: Equal to
- `lt(value)`: Less than
- `lte(value)`: Less than or equal to
- `gt(value)`: Greater than
- `gte(value)`: Greater than or equal to
- `between(value1, value2)`: Between two values (inclusive)
- `beginsWith(prefix)`: Begins with a prefix (for string sort keys)

### Examples

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

// Query by hash key only
const result1 = await query(posts, {
  keyCondition: exp => exp.where('userId').eq('user123')
});

// Query with sort key condition
const result2 = await query(posts, {
  keyCondition: exp => exp
    .where('userId').eq('user123')
    .where('postId').beginsWith('2023-')
});

// Query using a secondary index
const result3 = await query(posts, {
  index: 'byCreatedAt',
  keyCondition: exp => exp
    .where('userId').eq('user123')
    .where('createdAt').gt(1609459200000) // Posts created after Jan 1, 2021
});

// Query with between operator
const result4 = await query(posts, {
  index: 'byCreatedAt',
  keyCondition: exp => exp
    .where('userId').eq('user123')
    .where('createdAt').between(
      1609459200000, // Jan 1, 2021
      1640995200000  // Jan 1, 2022
    )
});
```

## Type Safety

All expression builders in the `@awsless/dynamodb` package are fully type-safe. This means:

1. You can only reference attributes that exist in your schema.
2. The operators available depend on the attribute type.
3. The values you provide must match the attribute type.

This helps catch errors at compile time rather than at runtime.

## Expression Attribute Names and Values

DynamoDB requires special handling for attribute names that conflict with reserved words and for attribute values. The `@awsless/dynamodb` package handles this automatically, generating the necessary expression attribute names and values behind the scenes.

## Performance Considerations

- Keep expressions as simple as possible for better performance.
- Use projections to retrieve only the attributes you need, especially for large items.
- For complex conditions, consider using multiple simpler operations instead of a single complex one.
- Remember that condition expressions consume additional read capacity units (RCUs).
