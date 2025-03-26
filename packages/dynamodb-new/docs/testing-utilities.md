# Testing Utilities

This section covers the testing utilities provided by the `@awsless/dynamodb` package for testing your DynamoDB code.

## Overview

The `@awsless/dynamodb` package includes several utilities to help you test your DynamoDB code without connecting to the actual AWS DynamoDB service. These utilities allow you to:

1. Mock the DynamoDB client
2. Run a local DynamoDB server
3. Seed tables with test data
4. Test DynamoDB streams

## mockDynamoDB

The `mockDynamoDB` function sets up a mock DynamoDB environment for testing. It intercepts all DynamoDB API calls and routes them to a local DynamoDB server.

### Syntax

```typescript
const server = mockDynamoDB(options);
```

### Parameters

- `options`: An object with the following properties:
  - `tables`: The table definitions or CreateTableCommandInput objects to create in the local DynamoDB server.
  - `seed` (optional): An array of seed data to populate the tables with.
  - `stream` (optional): An array of stream handlers to process DynamoDB streams.
  - `timeout` (optional): The timeout for the beforeAll hook in milliseconds.

### Return Value

Returns a `DynamoDBServer` instance that can be used to interact with the local DynamoDB server.

### Example

```typescript
import { mockDynamoDB, define, object, string, number } from '@awsless/dynamodb';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
    email: string(),
    age: number(),
  })
});

// Set up mock DynamoDB for testing
mockDynamoDB({
  tables: [users],
  timeout: 30000, // 30 seconds
});

// Now you can use the DynamoDB operations in your tests
test('should create and retrieve a user', async () => {
  const user = {
    id: 'user123',
    name: 'John Doe',
    email: 'john@example.com',
    age: 30,
  };

  await putItem(users, user);
  const result = await getItem(users, { id: 'user123' });

  expect(result).toEqual(user);
});
```

## DynamoDBServer

The `DynamoDBServer` class provides a local DynamoDB server for testing. It is used internally by `mockDynamoDB` but can also be used directly for more control.

### Example

```typescript
import { DynamoDBServer, migrate, define, object, string } from '@awsless/dynamodb';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
  })
});

// Create a DynamoDB server instance
const server = new DynamoDBServer();

beforeAll(async () => {
  // Start the server on a specific port
  await server.listen(8000);

  // Wait for the server to be ready
  await server.wait();

  // Create tables
  await migrate(server.getClient(), [users]);

  return async () => {
    // Stop the server after tests
    await server.kill();
  };
});

// Use the server in tests
test('should work with local DynamoDB', async () => {
  const client = server.getClient();
  // Use the client directly or with the @awsless/dynamodb operations
});
```

## seedTable

The `seedTable` function creates seed data for a table that can be used with `mockDynamoDB`.

### Syntax

```typescript
const seed = seedTable(table, ...items);
```

### Parameters

- `table`: The table definition created with the `define` function.
- `...items`: The items to seed the table with.

### Return Value

Returns a seed object that can be used with `mockDynamoDB`.

### Example

```typescript
import { mockDynamoDB, seedTable, define, object, string, number } from '@awsless/dynamodb';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
    email: string(),
    age: number(),
  })
});

// Set up mock DynamoDB with seed data
mockDynamoDB({
  tables: [users],
  seed: [
    seedTable(users,
      {
        id: 'user1',
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
      },
      {
        id: 'user2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        age: 28,
      }
    )
  ]
});

// Now your tests can assume these users exist
test('should retrieve seeded users', async () => {
  const user1 = await getItem(users, { id: 'user1' });
  expect(user1.name).toBe('John Doe');

  const user2 = await getItem(users, { id: 'user2' });
  expect(user2.name).toBe('Jane Smith');
});
```

## seed

The `seed` function is a lower-level utility to seed tables with data.

### Syntax

```typescript
await seed(seedData);
```

### Parameters

- `seedData`: An array of seed objects created with `seedTable`.

### Return Value

Returns a Promise that resolves when the seeding is complete.

### Example

```typescript
import { seed, seedTable, define, object, string } from '@awsless/dynamodb';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
  })
});

// Seed the table with data
await seed([
  seedTable(users,
    { id: 'user1', name: 'John Doe' },
    { id: 'user2', name: 'Jane Smith' }
  )
]);
```

## migrate

The `migrate` function creates tables in a DynamoDB server.

### Syntax

```typescript
await migrate(client, tables);
```

### Parameters

- `client`: A DynamoDB client instance.
- `tables`: The table definitions or CreateTableCommandInput objects to create.

### Return Value

Returns a Promise that resolves when the migration is complete.

### Example

```typescript
import { migrate, DynamoDBServer, define, object, string } from '@awsless/dynamodb';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
  })
});

const server = new DynamoDBServer();
await server.listen(8000);
await server.wait();

// Create tables
await migrate(server.getClient(), [users]);
```

## streamTable

The `streamTable` function creates a stream handler for a table that can be used with `mockDynamoDB`.

### Syntax

```typescript
const stream = streamTable(table, handler);
```

### Parameters

- `table`: The table definition created with the `define` function.
- `handler`: A function that will be called for each stream event.

### Return Value

Returns a stream object that can be used with `mockDynamoDB`.

### Example

```typescript
import { mockDynamoDB, streamTable, define, object, string } from '@awsless/dynamodb';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
  })
});

// Set up mock DynamoDB with stream handler
mockDynamoDB({
  tables: [users],
  stream: [
    streamTable(users, (event) => {
      console.log('Stream event:', event);
      // Process the stream event
      // event.Records contains the modified items
    })
  ]
});

// Now when you modify items, the stream handler will be called
test('should trigger stream handler', async () => {
  // Mock console.log to capture output
  const consoleSpy = jest.spyOn(console, 'log');

  await putItem(users, { id: 'user1', name: 'John Doe' });

  // Verify the stream handler was called
  expect(consoleSpy).toHaveBeenCalledWith(
    'Stream event:',
    expect.objectContaining({
      Records: expect.arrayContaining([
        expect.objectContaining({
          eventName: 'INSERT',
          dynamodb: expect.objectContaining({
            NewImage: expect.anything()
          })
        })
      ])
    })
  );

  consoleSpy.mockRestore();
});
```

## Integration with Testing Frameworks

The `mockDynamoDB` function is designed to work with testing frameworks like Jest and Vitest. It automatically sets up the necessary hooks to start and stop the DynamoDB server.

### Jest Example

```typescript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 30000, // Increase timeout for DynamoDB server startup
};

// users.test.ts
import { mockDynamoDB, putItem, getItem, define, object, string } from '@awsless/dynamodb';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
  })
});

// This will automatically set up beforeAll and afterAll hooks
mockDynamoDB({
  tables: [users],
});

test('should create and retrieve a user', async () => {
  await putItem(users, { id: 'user1', name: 'John Doe' });
  const user = await getItem(users, { id: 'user1' });
  expect(user).toEqual({ id: 'user1', name: 'John Doe' });
});
```

### Vitest Example

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    hookTimeout: 30000, // Increase timeout for DynamoDB server startup
  },
});

// users.test.ts
import { mockDynamoDB, putItem, getItem, define, object, string } from '@awsless/dynamodb';
import { describe, test, expect } from 'vitest';

const users = define('users', {
  hash: 'id',
  schema: object({
    id: string(),
    name: string(),
  })
});

// This will automatically set up beforeAll and afterAll hooks
mockDynamoDB({
  tables: [users],
});

describe('User operations', () => {
  test('should create and retrieve a user', async () => {
    await putItem(users, { id: 'user1', name: 'John Doe' });
    const user = await getItem(users, { id: 'user1' });
    expect(user).toEqual({ id: 'user1', name: 'John Doe' });
  });
});
```

## Best Practices

1. **Use a separate test database**: Always use a separate local DynamoDB instance for testing to avoid affecting your production data.
2. **Seed test data**: Use `seedTable` to set up test data before running your tests.
3. **Clean up after tests**: The `mockDynamoDB` function automatically cleans up after tests, but if you're using `DynamoDBServer` directly, make sure to call `server.kill()` after your tests.
4. **Increase timeouts**: DynamoDB server startup can take some time, so increase your test timeouts accordingly.
5. **Test streams**: If your application uses DynamoDB streams, use `streamTable` to test your stream handlers.
6. **Mock AWS credentials**: When testing, you don't need real AWS credentials. The local DynamoDB server doesn't require authentication.
