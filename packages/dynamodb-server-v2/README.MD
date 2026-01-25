# @awsless/dynamodb-server

A local DynamoDB server for testing and development. Provides both a fast in-memory implementation and a Java-based implementation using the official AWS DynamoDB Local.

## Features

- **Fast In-Memory Engine** - Lightning fast in-memory implementation for rapid testing
- **Java Engine** - Full compatibility mode using the official AWS DynamoDB Local
- **DynamoDB Streams** - Support for stream callbacks on item changes
- **TTL Support** - Time-to-live expiration for items
- **GSI/LSI Support** - Global and Local Secondary Index support

## Setup

Install with (NPM):

```
npm i @awsless/dynamodb-server
```

## Basic Usage

```ts
import { DynamoDBServer } from "@awsless/dynamodb-server"

// Create a server with the fast in-memory engine (default)
const server = new DynamoDBServer()

// Or use the Java engine for full compatibility
const server = new DynamoDBServer({ engine: "java" })

// Start the server
await server.listen(8000)

// Get a DynamoDB client configured to use the local server
const client = server.getClient()

// Get a DynamoDB Document client
const documentClient = server.getDocumentClient()

// Stop the server when done
await server.stop()
```

## Engines

### Memory Engine (Default)

The in-memory engine is optimized for speed and is perfect for unit tests. It implements the core DynamoDB operations without requiring Java.

```ts
const server = new DynamoDBServer({ engine: "memory" })
```

### Java Engine

The Java engine uses AWS DynamoDB Local for full compatibility with DynamoDB behavior. Requires Java to be installed.

```ts
const server = new DynamoDBServer({ engine: "java" })
```

## Configuration Options

```ts
const server = new DynamoDBServer({
  // Engine type: "memory" (default) or "java"
  engine: "memory",

  // Hostname to bind to (default: "localhost")
  hostname: "localhost",

  // Port to listen on (default: auto-assigned)
  port: 8000,

  // AWS region (default: "us-east-1")
  region: "us-east-1",
})
```

## Stream Support

You can subscribe to item changes using stream callbacks:

```ts
const unsubscribe = server.onStreamRecord("my-table", record => {
  console.log("Stream event:", record.eventName) // INSERT, MODIFY, or REMOVE
  console.log("Keys:", record.dynamodb.Keys)
  console.log("New Image:", record.dynamodb.NewImage)
  console.log("Old Image:", record.dynamodb.OldImage)
})

// Unsubscribe when done
unsubscribe()
```

## Testing with Vitest/Jest

```ts
import { DynamoDBServer } from "@awsless/dynamodb-server"
import { CreateTableCommand } from "@aws-sdk/client-dynamodb"
import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb"

describe("My DynamoDB Tests", () => {
  const server = new DynamoDBServer()

  beforeAll(async () => {
    await server.listen()

    // Create your tables
    await server.getClient().send(
      new CreateTableCommand({
        TableName: "users",
        KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
        AttributeDefinitions: [{ AttributeName: "id", AttributeType: "N" }],
        BillingMode: "PAY_PER_REQUEST",
      })
    )
  })

  afterAll(async () => {
    await server.stop()
  })

  it("should store and retrieve items", async () => {
    const client = server.getDocumentClient()

    await client.send(
      new PutCommand({
        TableName: "users",
        Item: { id: 1, name: "John" },
      })
    )

    const result = await client.send(
      new GetCommand({
        TableName: "users",
        Key: { id: 1 },
      })
    )

    expect(result.Item).toEqual({ id: 1, name: "John" })
  })
})
```

## License

MIT
