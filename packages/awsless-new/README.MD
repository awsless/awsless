

# TODO:
- add fargate container stuff for long lived services
- add check for existing graphql resolver field in schema
- add check for conflicting types inside graphql (Like duplicate type names)
  - Types should probably only allowed to defined once. And should be extended after that.

-

---
---
---

# Features

- Domains
- Sites
- Functions
- Database
  - Tables
  - Stores
  - Caches
  - Searchs
- Queues
- Topics
- Pubsub
- Crons
- API
  - HTTP
  - GraphQL


## Domains

We use AWS Route53 to provide domain management.

```json
{
  "domains": {
    "main": {
      "domain": "example.com",
      "dns": [{
        "name": "sub",
        "type": "A",
        "records": [ ... ],
      }]
    },
  }
}
```

## Functions

We use AWS Lambda to provide serverless functions.

```json
{
  "functions": {
  	"FUNCTION_NAME": "function.ts"
  }
}
```

## Tables

We use AWS DynamoDB to provide serverless tables.

```json
{
  "tables": {
    "TABLE_NAME": {
      "hash": "id",
      "fields": {
        "id": "number",
      }
    }
  }
}
```

## Stores

We use AWS S3 to provide serverless key-value storage.

```json
{
  "stores": [ "STORE_NAME" ]
}
```

## Caches

We use AWS MemoryDB to provide __redis compatible__ in-memory storage.

_WORK IN PROGRESS..._

## Searchs

We use AWS Open Search Serverless to provide serverless search api.

```json
{
  "searchs": [ "SEARCH_NAME" ]
}
```

## Queues

We use AWS SQS to provide serverless queues.

```json
{
  "queues": {
    "QUEUE_NAME": "queue-consumer.ts"
  }
}
```

## Topics

We use AWS SNS to provide serverless pubsub topics.

```json
{
  "topics": [ "TOPIC_NAME" ],
  "subscribers": {
    "TOPIC_NAME": "topic-consumer.ts",
  }
}
```

## Pubsub

We use AWS IoT to provide a serverless mqtt pubsub channel.

```json
{
  "pubsub": {
    "PUBSUB_NAME": {
      "sql": "SELECT * FROM '$aws/events/presence/connected/+'",
      "consumer": "pubsub-consumer.ts",
    }
  }
}
```

## Crons

We use AWS Event Bridge to provide serverless cron jobs.

```json
{
  "crons": {
    "CRON_NAME": {
      "schedule": "1 day",
      "consumer": "cron-consumer.ts",
    }
  }
}
```

## HTTP

We use AWS ELB to provide a HTTP API.

```json
{
  http: {
    HTTP_API_NAME: {
      'GET /posts': 'list-posts.ts',
      'POST /posts': 'create-post.ts',
    }
  }
}
```

## REST

We use AWS ApiGatewayV2 to provide a serverless REST API.

```json
{
  rest: {
    REST_API_NAME: {
      'GET /posts/{id}': 'get-posts.ts',
      'DELETE /posts/{id}': 'delete-post.ts',
    }
  }
}
```

## GraphQL

We use AWS AppSync to provide a serverless GraphQL API.

```json
{
  graphql: {
    GRAPHQL_API_NAME: {
      schema: 'schema.gql',
      resolvers: {
        'Query posts': 'list-posts.ts',
        'Mutation createPost': 'create-post.ts',
      }
    }
  }
}
```
