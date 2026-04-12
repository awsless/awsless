# Introduction to @awsless/dynamodb

## Overview

The `@awsless/dynamodb` package provides a small and tree-shakable layer around AWS SDK v3, making it easier to work with the DynamoDB API. It offers a fully typed API with a focus on developer experience, type safety, and performance.

This package addresses several common challenges when working with DynamoDB:

- **Floating Point Precision**: The package uses `@awsless/big-float` to handle floating-point numbers with precision, solving a common issue with many DynamoDB clients.
- **Tree-shakability**: The API is designed to balance tree-shakability with providing a fully typed API, ensuring your bundle only includes what you need.
- **Type Safety**: All operations are fully typed, providing excellent TypeScript support and catching errors at compile time.
- **Query Builder**: The package includes a type-safe and easy-to-use query expression builder.
- **Testing**: It provides a local DynamoDB server and mock that routes all DynamoDB requests to the local server, making testing easier.

## Key Features

- **Fully Typed API**: TypeScript definitions for all operations and schema types.
- **Schema Definition**: Define your table schema with type-safe schema builders.
- **Expression Builders**: Type-safe builders for condition, update, and key condition expressions.
- **Pagination Helpers**: Simplified pagination for query and scan operations.
- **Transaction Support**: Full support for DynamoDB transactions.
- **Batch Operations**: Support for batch get, put, and delete operations.
- **Testing Utilities**: Mock DynamoDB for testing with local DynamoDB server.
- **Tree-shakable**: Only include the operations you use in your bundle.

## Installation

### Prerequisites

- Node.js 14.x or later
- An AWS account with DynamoDB access
- AWS SDK v3 for JavaScript

### Installing with npm

```bash
npm install @awsless/dynamodb
```

### Installing with yarn

```bash
yarn add @awsless/dynamodb
```

### Installing with pnpm

```bash
pnpm add @awsless/dynamodb
```

## Basic Usage

Here's a simple example of how to use the package:

```typescript
import { putItem, getItem, define, object, string, number } from '@awsless/dynamodb';

// Define a table
const posts = define('posts', {
  hash: 'userId',
  sort: 'id',
  schema: object({
    id: number(),
    userId: number(),
    title: string(),
  })
});

// Insert a post into the posts table
await putItem(posts, {
  id: 1,
  userId: 1,
  title: 'Hello World'
});

// Get a post from the posts table
const post = await getItem(posts, { userId: 1, id: 1 });
```

For more detailed examples and usage instructions, see the other sections of this documentation.
