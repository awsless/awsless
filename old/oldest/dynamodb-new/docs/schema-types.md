# Schema Types

This section covers the schema types provided by the `@awsless/dynamodb` package for defining the structure of your DynamoDB tables.

## Overview

The `@awsless/dynamodb` package provides a variety of schema types to define the structure of your DynamoDB tables. These schema types are used to:

1. Validate data before writing to DynamoDB
2. Convert JavaScript/TypeScript types to DynamoDB attribute types
3. Convert DynamoDB attribute types back to JavaScript/TypeScript types
4. Provide type inference for TypeScript

## Primitive Types

### string

Defines a string attribute.

```typescript
import { define, object, string } from '@awsless/dynamodb';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
    email: string(),
  })
});
```

### number

Defines a number attribute.

```typescript
import { define, object, string, number } from '@awsless/dynamodb';

const products = define('products', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
    price: number(),
    quantity: number(),
  })
});
```

### boolean

Defines a boolean attribute.

```typescript
import { define, object, string, boolean } from '@awsless/dynamodb';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
    isActive: boolean(),
    isVerified: boolean(),
  })
});
```

### bigint

Defines a BigInt attribute.

```typescript
import { define, object, string, bigint } from '@awsless/dynamodb';

const transactions = define('transactions', {
  hash: 'id',
  schema: object({
    id: string(),
    userId: string(),
    amount: bigint(), // For large integer values
  })
});
```

### bigfloat

Defines a big float attribute using the `@awsless/big-float` package for precise decimal calculations.

```typescript
import { define, object, string, bigfloat } from '@awsless/dynamodb';

const financialRecords = define('financialRecords', {
  hash: 'id',
  schema: object({
    id: string(),
    amount: bigfloat(), // For precise decimal calculations
  })
});
```

### binary

Defines a binary attribute. The binary schema type supports various input types:

- ArrayBuffer
- Blob
- Buffer
- DataView
- File
- Int8Array
- Uint8Array
- Uint8ClampedArray
- Int16Array
- Uint16Array
- Int32Array
- Uint32Array
- Float32Array
- Float64Array
- BigInt64Array
- BigUint64Array

The output value is always `Uint8Array`.

```typescript
import { define, object, string, binary } from '@awsless/dynamodb';

const files = define('files', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
    content: binary(), // Stores binary data
  })
});
```

## Complex Types

### object

Defines an object attribute with nested properties.

```typescript
import { define, object, string, number } from '@awsless/dynamodb';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
    address: object({
      street: string(),
      city: string(),
      state: string(),
      zipCode: string(),
      country: string(),
    }),
  })
});
```

### array

Defines an array attribute.

```typescript
import { define, object, string, array } from '@awsless/dynamodb';

const posts = define('posts', {
  hash: 'id',
  schema: object({
    id: string(),
    title: string(),
    content: string(),
    tags: array(string()), // Array of strings
  })
});
```

Arrays can contain any other schema type:

```typescript
import { define, object, string, array, number } from '@awsless/dynamodb';

const orders = define('orders', {
  hash: 'id',
  schema: object({
    id: string(),
    userId: string(),
    items: array(object({
      productId: string(),
      quantity: number(),
      price: number(),
    })),
  })
});
```

### record

Defines a record (map) attribute with keys of one type and values of another type.

```typescript
import { define, object, string, record, number } from '@awsless/dynamodb';

const inventory = define('inventory', {
  hash: 'id',
  schema: object({
    id: string(),
    products: record(string(), number()), // Map of product IDs to quantities
  })
});
```

## Set Types

### stringSet

Defines a set of strings.

```typescript
import { define, object, string, stringSet } from '@awsless/dynamodb';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
    roles: stringSet(), // Set of string values (no duplicates)
  })
});
```

### numberSet

Defines a set of numbers.

```typescript
import { define, object, string, numberSet } from '@awsless/dynamodb';

const products = define('products', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
    prices: numberSet(), // Set of number values (no duplicates)
  })
});
```

### bigintSet

Defines a set of BigInt values.

```typescript
import { define, object, string, bigintSet } from '@awsless/dynamodb';

const transactions = define('transactions', {
  hash: 'id',
  schema: object({
    id: string(),
    amounts: bigintSet(), // Set of BigInt values (no duplicates)
  })
});
```

### binarySet

Defines a set of binary values.

```typescript
import { define, object, string, binarySet } from '@awsless/dynamodb';

const files = define('files', {
  hash: 'id',
  schema: object({
    id: string(),
    chunks: binarySet(), // Set of binary values (no duplicates)
  })
});
```

## Enum Types

### stringEnum

Defines a string enum attribute.

```typescript
import { define, object, string, stringEnum } from '@awsless/dynamodb';

const orders = define('orders', {
  hash: 'id',
  schema: object({
    id: string(),
    status: stringEnum(['pending', 'processing', 'shipped', 'delivered']),
  })
});
```

### numberEnum

Defines a number enum attribute.

```typescript
import { define, object, string, numberEnum } from '@awsless/dynamodb';

const tasks = define('tasks', {
  hash: 'id',
  schema: object({
    id: string(),
    priority: numberEnum([1, 2, 3, 4, 5]), // Priority levels
  })
});
```

## Special Types

### uuid

Defines a UUID attribute.

```typescript
import { define, object, uuid } from '@awsless/dynamodb';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: uuid(), // UUID string
    name: string(),
  })
});
```

### date

Defines a date attribute. Dates are stored as numbers (timestamps) in DynamoDB.

```typescript
import { define, object, string, date } from '@awsless/dynamodb';

const events = define('events', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
    startDate: date(), // Stored as a timestamp
    endDate: date(),
  })
});
```

### ttl

Defines a Time-To-Live attribute. TTL attributes are used by DynamoDB to automatically delete items after a specified time.

```typescript
import { define, object, string, ttl } from '@awsless/dynamodb';

const sessions = define('sessions', {
  hash: 'id',
  schema: object({
    id: string(),
    userId: string(),
    data: string(),
    expiresAt: ttl(), // TTL attribute for automatic deletion
  })
});
```

### any

Defines an attribute that can be of any type. Use this sparingly as it bypasses type checking.

```typescript
import { define, object, string, any } from '@awsless/dynamodb';

const documents = define('documents', {
  hash: 'id',
  schema: object({
    id: string(),
    data: any(), // Can store any type of data
  })
});
```

### unknown

Similar to `any`, but provides better type safety in TypeScript.

```typescript
import { define, object, string, unknown } from '@awsless/dynamodb';

const documents = define('documents', {
  hash: 'id',
  schema: object({
    id: string(),
    data: unknown(), // Can store any type of data, but with better type safety
  })
});
```

### json

Defines a JSON attribute. The value is automatically serialized to a string when stored and deserialized when retrieved.

```typescript
import { define, object, string, json } from '@awsless/dynamodb';

const documents = define('documents', {
  hash: 'id',
  schema: object({
    id: string(),
    data: json(), // Automatically serialized/deserialized JSON
  })
});
```

## Modifiers

### optional

Makes an attribute optional.

```typescript
import { define, object, string, number, optional } from '@awsless/dynamodb';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
    email: string(),
    phone: optional(string()), // Optional attribute
    age: optional(number()),   // Optional attribute
  })
});
```

## Type Inference

The `@awsless/dynamodb` package provides type inference utilities to extract the input and output types of a table definition.

### Input

The `Input` type represents the shape of items when inserting them into the table:

```typescript
import { define, Input, object, string, binary } from '@awsless/dynamodb';

const files = define('files', {
  hash: 'id',
  schema: object({
    id: string(),
    content: binary(),
  })
});

// Input type can accept various binary formats
type FileInput = Input<typeof files>;
// {
//   id: string,
//   content: ArrayBuffer | Blob | Buffer | ... (any binary type)
// }
```

### Output

The `Output` type represents the shape of items when retrieving them from the table:

```typescript
import { define, Output, object, string, binary } from '@awsless/dynamodb';

const files = define('files', {
  hash: 'id',
  schema: object({
    id: string(),
    content: binary(),
  })
});

// Output type always has Uint8Array for binary
type FileOutput = Output<typeof files>;
// {
//   id: string,
//   content: Uint8Array
// }
```

## Best Practices

1. **Use the most specific schema type** for your data to ensure type safety and validation.
2. **Make attributes optional** when they are not required, using the `optional` modifier.
3. **Use `bigfloat` for financial calculations** to avoid floating-point precision issues.
4. **Use `ttl` for temporary data** that should be automatically deleted after a certain time.
5. **Avoid using `any` when possible** as it bypasses type checking. Use `unknown` instead if you need flexibility.
6. **Use `uuid` for unique identifiers** instead of manually generating and validating UUIDs.
7. **Use enums for attributes with a fixed set of values** to ensure data consistency.
