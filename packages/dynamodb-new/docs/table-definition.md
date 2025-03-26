# Table Definition

This section covers how to define DynamoDB tables using the `@awsless/dynamodb` package.

## Defining Tables

Tables are defined using the `define` function, which creates a strongly-typed table definition that can be used with all the operation functions.

```typescript
import { define, object, string, number } from '@awsless/dynamodb';

const posts = define('posts', {
  hash: 'userId',
  sort: 'id',
  schema: object({
    id: number(),
    userId: number(),
    title: string(),
    content: string(),
    createdAt: number(),
  })
});
```

### Parameters

- `name`: The name of the DynamoDB table.
- `options`: An object containing the table configuration:
  - `hash`: The hash key (partition key) field name.
  - `sort` (optional): The sort key (range key) field name.
  - `schema`: The schema definition for the table items.
  - `indexes` (optional): Secondary indexes for the table.

## Primary Keys

DynamoDB tables require a primary key, which can be either:

1. **Simple Primary Key**: Just a partition key (hash key).
2. **Composite Primary Key**: A partition key (hash key) and a sort key (range key).

### Simple Primary Key Example

```typescript
const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
    email: string(),
  })
});
```

### Composite Primary Key Example

```typescript
const userPosts = define('userPosts', {
  hash: 'userId',
  sort: 'postId',
  schema: object({
    userId: string(),
    postId: string(),
    title: string(),
    content: string(),
  })
});
```

## Secondary Indexes

Secondary indexes allow you to query the data in the table using an alternate key, in addition to queries against the primary key.

### Defining Indexes

```typescript
const posts = define('posts', {
  hash: 'userId',
  sort: 'postId',
  schema: object({
    userId: string(),
    postId: string(),
    title: string(),
    category: string(),
    createdAt: number(),
  }),
  indexes: {
    byCategory: {
      hash: 'category',
      sort: 'createdAt'
    },
    byCreatedAt: {
      hash: 'userId',
      sort: 'createdAt'
    }
  }
});
```

In this example:
- `byCategory` is a global secondary index that allows querying posts by category and creation time.
- `byCreatedAt` is a local secondary index that allows querying a user's posts by creation time.

## Type Inference

The `@awsless/dynamodb` package provides type inference utilities to extract the input and output types of a table definition.

### Input Type

The `Input` type represents the shape of items when inserting them into the table:

```typescript
import { Input } from '@awsless/dynamodb';

type PostInput = Input<typeof posts>;

// Now you can use this type for your function parameters
function createPost(post: PostInput) {
  return putItem(posts, post);
}
```

### Output Type

The `Output` type represents the shape of items when retrieving them from the table:

```typescript
import { Output } from '@awsless/dynamodb';

type PostOutput = Output<typeof posts>;

// Now you can use this type for your function return values
async function getPost(userId: string, postId: string): Promise<PostOutput | undefined> {
  return getItem(posts, { userId, postId });
}
```

The difference between `Input` and `Output` types is important for certain schema types like `binary`, where the input might be various binary formats, but the output is always `Uint8Array`.

## Schema Types

The schema defines the structure of items in your table. The `@awsless/dynamodb` package provides a variety of schema types to define your data model.

For a complete list of schema types and their usage, see the [Schema Types](./schema-types.md) section.

## Example: Complete Table Definition

Here's a complete example of defining a table with indexes and using type inference:

```typescript
import { define, object, string, number, date, optional, Input, Output } from '@awsless/dynamodb';

const posts = define('posts', {
  hash: 'userId',
  sort: 'postId',
  schema: object({
    userId: string(),
    postId: string(),
    title: string(),
    content: string(),
    category: string(),
    tags: optional(array(string())),
    viewCount: number(),
    createdAt: date(),
    updatedAt: optional(date()),
  }),
  indexes: {
    byCategory: {
      hash: 'category',
      sort: 'createdAt'
    }
  }
});

// Input type for creating/updating posts
type PostInput = Input<typeof posts>;

// Output type for retrieved posts
type PostOutput = Output<typeof posts>;

// Example usage
async function createPost(post: PostInput) {
  return putItem(posts, post);
}

async function getPostsByCategory(category: string) {
  return query(posts, {
    index: 'byCategory',
    keyCondition: exp => exp.where('category').eq(category)
  });
}
